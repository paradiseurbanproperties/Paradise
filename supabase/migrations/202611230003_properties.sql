-- Fase 6: catálogo persistente, asignaciones, características e imágenes.
-- Los binarios viven en el bucket privado property-images; PostgreSQL guarda
-- sus metadatos y una ruta que referencia la propiedad y la imagen.

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null default '',
  property_type text not null
    check (property_type in ('house', 'apartment', 'land', 'country_house')),
  price numeric(14, 2) not null check (price >= 0),
  currency text not null default 'MXN' check (currency = 'MXN'),
  bedrooms smallint not null default 0 check (bedrooms >= 0),
  bathrooms numeric(4, 1) not null default 0 check (bathrooms >= 0),
  parking smallint not null default 0 check (parking >= 0),
  built_area numeric(12, 2) not null default 0 check (built_area >= 0),
  land_area numeric(12, 2) not null default 0 check (land_area >= 0),
  address text not null default '',
  neighborhood text not null default '',
  city text not null,
  state text not null,
  postal_code text not null default '',
  latitude double precision,
  longitude double precision,
  status text not null default 'available'
    check (status in ('available', 'in_deal', 'sold')),
  visibility text not null default 'public'
    check (visibility in ('public', 'premium', 'both')),
  publication_status text not null default 'draft'
    check (publication_status in ('draft', 'pending', 'approved', 'rejected', 'archived')),
  featured boolean not null default false,
  created_by uuid not null references public.profiles (id) on delete restrict,
  approved_by uuid references public.profiles (id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint properties_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint properties_coordinates_pair check (
    (latitude is null and longitude is null)
    or (
      latitude is not null and longitude is not null
      and latitude between -90 and 90
      and longitude between -180 and 180
    )
  )
);

create table public.agent_assignments (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  agent_id uuid not null references public.profiles (id) on delete restrict,
  assigned_by uuid not null references public.profiles (id) on delete restrict,
  assigned_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint agent_assignments_valid_revocation check (revoked_at is null or revoked_at >= assigned_at)
);

create unique index agent_assignments_one_active_idx
  on public.agent_assignments (property_id, agent_id)
  where revoked_at is null;

create table public.property_images (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  storage_path text not null unique,
  alt_text text not null default '',
  sort_order integer not null default 0 check (sort_order >= 0),
  is_cover boolean not null default false,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/avif')),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 10485760),
  uploaded_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint property_images_storage_path check (
    storage_path ~ ('^' || property_id::text || '/[0-9a-f-]+\.(jpg|jpeg|png|webp|avif)$')
  )
);

create unique index property_images_one_cover_idx
  on public.property_images (property_id)
  where is_cover;

create table public.property_features (
  id uuid primary key default gen_random_uuid(),
  feature_key text not null unique check (feature_key ~ '^[a-z0-9_]+$'),
  label text not null,
  created_at timestamptz not null default now()
);

create table public.property_feature_values (
  property_id uuid not null references public.properties (id) on delete cascade,
  feature_id uuid not null references public.property_features (id) on delete restrict,
  value jsonb not null default 'true'::jsonb,
  primary key (property_id, feature_id)
);

create index properties_public_catalog_idx
  on public.properties (published_at desc, id)
  where publication_status = 'approved' and visibility in ('public', 'both');
create index properties_city_type_idx on public.properties (city, property_type);
create index properties_price_idx on public.properties (price);
create index properties_status_visibility_idx on public.properties (status, visibility, publication_status);
create index properties_created_by_idx on public.properties (created_by, created_at desc);
create index agent_assignments_agent_active_idx
  on public.agent_assignments (agent_id, assigned_at desc)
  where revoked_at is null;
create index property_images_property_order_idx on public.property_images (property_id, sort_order);
create index property_feature_values_feature_idx on public.property_feature_values (feature_id, property_id);

create trigger properties_set_updated_at
  before update on public.properties
  for each row execute function public.set_updated_at();

create or replace function private.is_assigned_agent(target_property_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.agent_assignments as assignment
    join public.profiles as profile on profile.id = assignment.agent_id
    where assignment.property_id = target_property_id
      and assignment.agent_id = (select auth.uid())
      and assignment.revoked_at is null
      and profile.base_role = 'agent'
      and profile.account_status = 'active'
  );
$$;

revoke all on function private.is_assigned_agent(uuid) from public, anon, authenticated;
grant execute on function private.is_assigned_agent(uuid) to authenticated;

alter table public.properties enable row level security;
alter table public.agent_assignments enable row level security;
alter table public.property_images enable row level security;
alter table public.property_features enable row level security;
alter table public.property_feature_values enable row level security;

revoke all on table public.properties, public.agent_assignments, public.property_images,
  public.property_features, public.property_feature_values from anon, authenticated;
grant select on table public.properties, public.property_images,
  public.property_features, public.property_feature_values to anon, authenticated;
grant insert, update, delete on table public.properties, public.agent_assignments,
  public.property_images, public.property_features, public.property_feature_values to authenticated;

create policy properties_public_read
  on public.properties for select to anon
  using (publication_status = 'approved' and visibility in ('public', 'both'));
create policy properties_authenticated_read
  on public.properties for select to authenticated
  using (
    (publication_status = 'approved' and visibility in ('public', 'both'))
    or (select private.is_active_admin())
    or (select private.is_assigned_agent(id))
  );

create policy properties_admin_insert
  on public.properties for insert to authenticated
  with check ((select private.is_active_admin()) and created_by = (select auth.uid()));
create policy properties_admin_update
  on public.properties for update to authenticated
  using ((select private.is_active_admin()))
  with check ((select private.is_active_admin()));
create policy properties_admin_delete
  on public.properties for delete to authenticated
  using ((select private.is_active_admin()));

create policy agent_assignments_admin_all
  on public.agent_assignments for all to authenticated
  using ((select private.is_active_admin()))
  with check (
    (select private.is_active_admin())
    and exists (
      select 1 from public.profiles as agent
      where agent.id = agent_id and agent.base_role = 'agent' and agent.account_status = 'active'
    )
  );
create policy agent_assignments_agent_read_own
  on public.agent_assignments for select to authenticated
  using (agent_id = (select auth.uid()) and revoked_at is null);

create policy property_images_public_read
  on public.property_images for select to anon, authenticated
  using (
    exists (
      select 1 from public.properties as property
      where property.id = property_id
        and property.publication_status = 'approved'
        and property.visibility in ('public', 'both')
    )
  );
create policy property_images_agent_read_assigned
  on public.property_images for select to authenticated
  using ((select private.is_assigned_agent(property_id)));
create policy property_images_admin_insert
  on public.property_images for insert to authenticated
  with check ((select private.is_active_admin()) and uploaded_by = (select auth.uid()));
create policy property_images_admin_update
  on public.property_images for update to authenticated
  using ((select private.is_active_admin()))
  with check ((select private.is_active_admin()));
create policy property_images_admin_delete
  on public.property_images for delete to authenticated
  using ((select private.is_active_admin()));
create policy property_images_admin_read
  on public.property_images for select to authenticated
  using ((select private.is_active_admin()));

create policy property_features_public_read
  on public.property_features for select to anon, authenticated using (true);
create policy property_features_admin_write
  on public.property_features for all to authenticated
  using ((select private.is_active_admin()))
  with check ((select private.is_active_admin()));

create policy property_feature_values_public_read
  on public.property_feature_values for select to anon
  using (
    exists (
      select 1 from public.properties as property
      where property.id = property_id
        and property.publication_status = 'approved'
        and property.visibility in ('public', 'both')
    )
  );
create policy property_feature_values_authenticated_read
  on public.property_feature_values for select to authenticated
  using (
    exists (
      select 1 from public.properties as property
      where property.id = property_id
        and property.publication_status = 'approved'
        and property.visibility in ('public', 'both')
    )
    or (select private.is_active_admin())
    or (select private.is_assigned_agent(property_id))
  );
create policy property_feature_values_admin_write
  on public.property_feature_values for all to authenticated
  using ((select private.is_active_admin()))
  with check ((select private.is_active_admin()));

-- El bucket permanece privado. La descarga y generación de enlaces firmados
-- solo se permiten cuando la ficha es pública/aprobada, o al administrador.
create policy property_images_storage_read
  on storage.objects for select to anon
  using (
    bucket_id = 'property-images'
    and exists (
      select 1
      from public.property_images as image
      join public.properties as property on property.id = image.property_id
      where image.storage_path = name
        and property.publication_status = 'approved'
        and property.visibility in ('public', 'both')
    )
  );
create policy property_images_storage_authenticated_read
  on storage.objects for select to authenticated
  using (
    bucket_id = 'property-images'
    and (
      (select private.is_active_admin())
      or exists (
        select 1
        from public.property_images as image
        where image.storage_path = name
          and (select private.is_assigned_agent(image.property_id))
      )
      or exists (
        select 1
        from public.property_images as image
        join public.properties as property on property.id = image.property_id
        where image.storage_path = name
          and property.publication_status = 'approved'
          and property.visibility in ('public', 'both')
      )
    )
  );
create policy property_images_storage_admin_insert
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'property-images'
    and (select private.is_active_admin())
    and exists (
      select 1 from public.properties as property
      where name like property.id::text || '/%'
    )
  );
create policy property_images_storage_admin_update
  on storage.objects for update to authenticated
  using (bucket_id = 'property-images' and (select private.is_active_admin()))
  with check (bucket_id = 'property-images' and (select private.is_active_admin()));
create policy property_images_storage_admin_delete
  on storage.objects for delete to authenticated
  using (bucket_id = 'property-images' and (select private.is_active_admin()));
