-- Fase 7: coordenadas indexadas y búsqueda pública por radio.
-- Habilita primero PostGIS desde Supabase Database > Extensions en el esquema
-- predeterminado `extensions`, nunca en `public`.

do $$
begin
  if not exists (select 1 from pg_extension where extname = 'postgis') then
    raise exception 'Enable the PostGIS extension in the extensions schema before this migration';
  end if;
end;
$$;

alter table public.properties
  add column location extensions.geography(point, 4326);

create or replace function private.sync_property_geography()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.latitude is null or new.longitude is null then
    new.location := null;
  else
    new.location := extensions.st_point(new.longitude, new.latitude)::extensions.geography;
  end if;
  return new;
end;
$$;

revoke all on function private.sync_property_geography() from public, anon, authenticated;

create trigger properties_sync_geography
  before insert or update of latitude, longitude on public.properties
  for each row execute function private.sync_property_geography();

-- Sincroniza coordenadas que ya estaban en las columnas lat/lng antes de Fase 7.
update public.properties
set latitude = latitude
where latitude is not null and longitude is not null;

create index properties_location_gist_idx
  on public.properties using gist (location)
  where location is not null;

create or replace function public.search_public_properties_nearby(
  center_latitude double precision,
  center_longitude double precision,
  radius_meters integer default 5000,
  result_limit integer default 60
)
returns setof public.properties
language plpgsql
stable
security invoker
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
    select property.*
    from public.properties as property
    where property.location is not null
      and property.publication_status = 'approved'
      and property.visibility in ('public', 'both')
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
  from public;
grant execute on function public.search_public_properties_nearby(double precision, double precision, integer, integer)
  to anon, authenticated;
