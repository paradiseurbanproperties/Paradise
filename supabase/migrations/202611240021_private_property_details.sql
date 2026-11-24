-- Fase 14: separar información operativa de propiedades de las columnas públicas.
create table public.property_private_details (
  property_id uuid primary key references public.properties (id) on delete cascade,
  address text not null default '' check (char_length(address) <= 240),
  postal_code text not null default '' check (char_length(postal_code) <= 16),
  exact_latitude double precision,
  exact_longitude double precision,
  created_by uuid not null references public.profiles (id) on delete restrict,
  approved_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint property_private_coordinates_pair check (
    (exact_latitude is null and exact_longitude is null)
    or (
      exact_latitude is not null and exact_longitude is not null
      and exact_latitude between -90 and 90
      and exact_longitude between -180 and 180
    )
  )
);

insert into public.property_private_details (
  property_id, address, postal_code, exact_latitude, exact_longitude, created_by, approved_by, created_at, updated_at
)
select id, address, postal_code, latitude, longitude, created_by, approved_by, created_at, updated_at
from public.properties;

update public.properties as property
set latitude = case when details.exact_latitude is null then null else round(details.exact_latitude::numeric, 3)::double precision end,
    longitude = case when details.exact_longitude is null then null else round(details.exact_longitude::numeric, 3)::double precision end
from public.property_private_details as details
where details.property_id = property.id;

alter table public.property_private_details enable row level security;
revoke all on table public.property_private_details from public, anon, authenticated;
grant select (property_id, address, postal_code, exact_latitude, exact_longitude)
  on table public.property_private_details to authenticated;
grant insert (property_id, address, postal_code, exact_latitude, exact_longitude, created_by)
  on table public.property_private_details to authenticated;
grant update (address, postal_code, exact_latitude, exact_longitude, approved_by, updated_at)
  on table public.property_private_details to authenticated;

create policy property_private_details_staff_read
  on public.property_private_details for select to authenticated
  using (
    (select private.is_active_admin())
    or (select private.is_assigned_agent(property_id))
  );

create policy property_private_details_admin_insert
  on public.property_private_details for insert to authenticated
  with check (
    (select private.is_active_admin())
    and created_by = (select auth.uid())
  );

create policy property_private_details_admin_update
  on public.property_private_details for update to authenticated
  using ((select private.is_active_admin()))
  with check ((select private.is_active_admin()));

create or replace function private.set_property_approximate_location()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.properties
  set latitude = case when new.exact_latitude is null then null else round(new.exact_latitude::numeric, 3)::double precision end,
      longitude = case when new.exact_longitude is null then null else round(new.exact_longitude::numeric, 3)::double precision end
  where id = new.property_id;
  return new;
end;
$$;

revoke all on function private.set_property_approximate_location() from public, anon, authenticated;
create trigger property_private_details_sync_public_location
  after insert or update of exact_latitude, exact_longitude on public.property_private_details
  for each row execute function private.set_property_approximate_location();

create or replace function private.enforce_property_approximate_location()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  exact_lat double precision;
  exact_lon double precision;
begin
  if tg_op = 'UPDATE' then
    select details.exact_latitude, details.exact_longitude
      into exact_lat, exact_lon
    from public.property_private_details as details
    where details.property_id = new.id;
  end if;
  new.latitude := case when exact_lat is null then null else round(exact_lat::numeric, 3)::double precision end;
  new.longitude := case when exact_lon is null then null else round(exact_lon::numeric, 3)::double precision end;
  return new;
end;
$$;

revoke all on function private.enforce_property_approximate_location() from public, anon, authenticated;
create trigger properties_enforce_approximate_location
  before insert or update of latitude, longitude on public.properties
  for each row execute function private.enforce_property_approximate_location();

drop index if exists public.properties_created_by_idx;
drop policy if exists properties_admin_insert on public.properties;
create policy properties_admin_insert
  on public.properties for insert to authenticated
  with check ((select private.is_active_admin()));

alter table public.properties
  drop column address,
  drop column postal_code,
  drop column created_by,
  drop column approved_by;

-- RLS filters rows; these grants expose only the fields needed by the catalog and Admin UI.
revoke select on table public.properties from public, anon, authenticated;
grant select (
  id, slug, title, description, property_type, price, currency,
  bedrooms, bathrooms, parking, built_area, land_area,
  neighborhood, city, state, latitude, longitude,
  status, visibility, publication_status, featured,
  published_at, created_at, updated_at
) on table public.properties to anon, authenticated;

-- No exponer el actor que cargó una fotografía desde el API público.
revoke select on table public.property_images from public, anon, authenticated;
grant select (
  id, property_id, storage_path, alt_text, sort_order, is_cover, mime_type, size_bytes, created_at
) on table public.property_images to anon, authenticated;

-- El autor del cambio de precio es interno; el historial público solo necesita importes y fechas.
revoke select on table public.property_price_history from public, anon, authenticated;
grant select (id, property_id, previous_price, new_price, currency, changed_at)
  on table public.property_price_history to anon, authenticated;

-- The nearby search needs exact coordinates internally but returns only eligible IDs.
drop function public.search_public_properties_nearby(double precision, double precision, integer, integer);
create function public.search_public_properties_nearby(
  center_latitude double precision,
  center_longitude double precision,
  radius_meters integer default 5000,
  result_limit integer default 60
)
returns table (id uuid)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if center_latitude is null or center_latitude not between -90 and 90
    or center_longitude is null or center_longitude not between -180 and 180 then
    raise exception 'invalid_coordinates' using errcode = '22023';
  end if;
  if radius_meters is null or radius_meters < 100 or radius_meters > 50000 then
    raise exception 'invalid_radius' using errcode = '22023';
  end if;
  if result_limit is null or result_limit < 1 or result_limit > 100 then
    raise exception 'invalid_limit' using errcode = '22023';
  end if;

  return query
    select property.id
    from public.properties as property
    where property.location is not null
      and property.publication_status = 'approved'
      and (
        property.visibility in ('public', 'both')
        or (property.visibility = 'premium' and (select private.has_active_premium_membership()))
      )
      and extensions.st_dwithin(
        property.location,
        extensions.st_point(center_longitude, center_latitude)::extensions.geography,
        radius_meters
      )
    order by extensions.st_distance(
      property.location,
      extensions.st_point(center_longitude, center_latitude)::extensions.geography
    ), property.id
    limit result_limit;
end;
$$;

revoke all on function public.search_public_properties_nearby(double precision, double precision, integer, integer)
  from public, anon, authenticated;
grant execute on function public.search_public_properties_nearby(double precision, double precision, integer, integer)
  to anon, authenticated;
