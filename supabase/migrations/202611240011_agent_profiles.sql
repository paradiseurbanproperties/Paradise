-- Fase 10: perfiles profesionales de agentes y directorio público moderado.

create table public.agents (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  public_name text not null check (char_length(btrim(public_name)) between 2 and 120),
  biography text not null default '' check (char_length(biography) <= 2400),
  specialties text[] not null default '{}'::text[] check (cardinality(specialties) <= 12),
  service_areas text[] not null default '{}'::text[] check (cardinality(service_areas) <= 20),
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index agents_public_directory_idx on public.agents (public_name, slug) where is_public;

create trigger agents_set_updated_at
  before update on public.agents
  for each row execute function public.set_updated_at();

create or replace function private.is_agent_profile(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles as profile
    where profile.id = target_profile_id
      and profile.base_role = 'agent'
  );
$$;

create or replace function private.is_active_agent(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles as profile
    where profile.id = target_profile_id
      and profile.base_role = 'agent'
      and profile.account_status = 'active'
  );
$$;

revoke all on function private.is_agent_profile(uuid) from public, anon, authenticated;
revoke all on function private.is_active_agent(uuid) from public, anon, authenticated;
grant usage on schema private to anon;
grant execute on function private.is_agent_profile(uuid) to authenticated;
grant execute on function private.is_active_agent(uuid) to anon, authenticated;

alter table public.agents enable row level security;
revoke all on table public.agents from public, anon, authenticated;
grant select on table public.agents to anon, authenticated;
grant insert, update, delete on table public.agents to authenticated;

create policy agents_public_read
  on public.agents for select to anon, authenticated
  using (is_public and (select private.is_active_agent(profile_id)));

create policy agents_self_read
  on public.agents for select to authenticated
  using (profile_id = (select auth.uid()));

create policy agents_admin_manage
  on public.agents for all to authenticated
  using ((select private.is_active_admin()))
  with check (
    (select private.is_active_admin())
    and (select private.is_agent_profile(profile_id))
  );
