-- Fase 11: favoritos privados de cada Cliente.

create table public.favorites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, property_id)
);

create index favorites_user_created_idx on public.favorites (user_id, created_at desc);

alter table public.favorites enable row level security;
revoke all on table public.favorites from public, anon, authenticated;
grant select, insert, delete on table public.favorites to authenticated;

create policy favorites_client_read_own
  on public.favorites for select to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.profiles as profile
      where profile.id = (select auth.uid())
        and profile.base_role = 'client'
        and profile.account_status = 'active'
    )
  );

create policy favorites_client_add_visible_property
  on public.favorites for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.profiles as profile
      where profile.id = (select auth.uid())
        and profile.base_role = 'client'
        and profile.account_status = 'active'
    )
    and exists (
      select 1 from public.properties as property
      where property.id = property_id
    )
  );

create policy favorites_client_remove_own
  on public.favorites for delete to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.profiles as profile
      where profile.id = (select auth.uid())
        and profile.base_role = 'client'
        and profile.account_status = 'active'
    )
  );
