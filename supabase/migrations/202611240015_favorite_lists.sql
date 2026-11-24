-- Fase 11: listas privadas para organizar propiedades favoritas.

create table public.favorite_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (name = btrim(name) and char_length(name) between 1 and 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index favorite_lists_owner_name_idx
  on public.favorite_lists (user_id, lower(name));
create index favorite_lists_owner_created_idx
  on public.favorite_lists (user_id, created_at desc);

create table public.favorite_list_properties (
  list_id uuid not null references public.favorite_lists (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (list_id, property_id)
);

create index favorite_list_properties_property_idx
  on public.favorite_list_properties (property_id);

create trigger favorite_lists_set_updated_at
  before update on public.favorite_lists
  for each row execute function public.set_updated_at();

alter table public.favorite_lists enable row level security;
alter table public.favorite_list_properties enable row level security;
revoke all on table public.favorite_lists, public.favorite_list_properties from public, anon, authenticated;
grant select, insert, delete on table public.favorite_lists to authenticated;
grant update (name) on table public.favorite_lists to authenticated;
grant select, insert, delete on table public.favorite_list_properties to authenticated;

create policy favorite_lists_client_read_own
  on public.favorite_lists for select to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.profiles as profile
      where profile.id = (select auth.uid())
        and profile.base_role = 'client'
        and profile.account_status = 'active'
    )
  );

create policy favorite_lists_client_add_own
  on public.favorite_lists for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.profiles as profile
      where profile.id = (select auth.uid())
        and profile.base_role = 'client'
        and profile.account_status = 'active'
    )
  );

create policy favorite_lists_client_edit_own
  on public.favorite_lists for update to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.profiles as profile
      where profile.id = (select auth.uid())
        and profile.base_role = 'client'
        and profile.account_status = 'active'
    )
  )
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.profiles as profile
      where profile.id = (select auth.uid())
        and profile.base_role = 'client'
        and profile.account_status = 'active'
    )
  );

create policy favorite_lists_client_remove_own
  on public.favorite_lists for delete to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.profiles as profile
      where profile.id = (select auth.uid())
        and profile.base_role = 'client'
        and profile.account_status = 'active'
    )
  );

create policy favorite_list_properties_read_own
  on public.favorite_list_properties for select to authenticated
  using (
    exists (
      select 1 from public.favorite_lists as favorite_list
      join public.profiles as profile on profile.id = favorite_list.user_id
      where favorite_list.id = list_id
        and favorite_list.user_id = (select auth.uid())
        and profile.base_role = 'client'
        and profile.account_status = 'active'
    )
  );

create policy favorite_list_properties_add_visible
  on public.favorite_list_properties for insert to authenticated
  with check (
    exists (
      select 1 from public.favorite_lists as favorite_list
      join public.profiles as profile on profile.id = favorite_list.user_id
      where favorite_list.id = list_id
        and favorite_list.user_id = (select auth.uid())
        and profile.base_role = 'client'
        and profile.account_status = 'active'
    )
    and exists (
      select 1 from public.properties as property
      where property.id = favorite_list_properties.property_id
    )
    and exists (
      select 1 from public.favorites as favorite
      where favorite.user_id = (select auth.uid())
        and favorite.property_id = favorite_list_properties.property_id
    )
  );

create policy favorite_list_properties_remove_own
  on public.favorite_list_properties for delete to authenticated
  using (
    exists (
      select 1 from public.favorite_lists as favorite_list
      join public.profiles as profile on profile.id = favorite_list.user_id
      where favorite_list.id = list_id
        and favorite_list.user_id = (select auth.uid())
        and profile.base_role = 'client'
        and profile.account_status = 'active'
    )
  );
