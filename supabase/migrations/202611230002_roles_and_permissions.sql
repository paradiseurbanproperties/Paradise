-- Fase 5: roles base y autoridad en servidor/RLS.
-- Premium sigue siendo una suscripción, no un rol.

alter table public.profiles
  add column base_role text not null default 'client',
  add column account_status text not null default 'active',
  add constraint profiles_base_role_check
    check (base_role in ('client', 'agent', 'admin')),
  add constraint profiles_account_status_check
    check (account_status in ('active', 'suspended'));

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

-- Esta función solo devuelve el rol de la identidad que hace la petición.
-- SECURITY DEFINER evita consultar profiles bajo su propia policy RLS.
create or replace function private.current_profile_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select profile.base_role
  from public.profiles as profile
  where profile.id = (select auth.uid())
  limit 1;
$$;

revoke all on function private.current_profile_role() from public, anon, authenticated;
grant execute on function private.current_profile_role() to authenticated;

create or replace function private.is_active_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles as profile
    where profile.id = (select auth.uid())
      and profile.base_role = 'admin'
      and profile.account_status = 'active'
  );
$$;

revoke all on function private.is_active_admin() from public, anon, authenticated;
grant execute on function private.is_active_admin() to authenticated;

create policy "profiles_read_admin"
  on public.profiles
  for select
  to authenticated
  using ((select private.is_active_admin()));

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_data jsonb not null default '{}'::jsonb,
  after_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_created_at_idx on public.audit_logs (created_at desc);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id, created_at desc);
alter table public.audit_logs enable row level security;
revoke all on table public.audit_logs from anon, authenticated;
grant select on table public.audit_logs to authenticated;

create policy "audit_logs_read_admin"
  on public.audit_logs
  for select
  to authenticated
  using ((select private.is_active_admin()));

-- Solo una identidad admin puede promover/degradar a otra cuenta.
-- El RPC vive en public para que el endpoint RPC de Supabase lo alcance;
-- su cuerpo valida actor, objetivo y valores, y no devuelve datos de perfil.
create or replace function public.admin_set_profile_access(
  target_user_id uuid,
  new_base_role text,
  new_account_status text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  previous_role text;
  previous_status text;
begin
  if (select auth.uid()) is null
    or not (select private.is_active_admin()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if target_user_id = (select auth.uid()) then
    raise exception 'cannot_change_own_access' using errcode = '42501';
  end if;

  if new_base_role is null or new_base_role not in ('client', 'agent', 'admin') then
    raise exception 'invalid_role' using errcode = '22023';
  end if;

  if new_account_status is null or new_account_status not in ('active', 'suspended') then
    raise exception 'invalid_account_status' using errcode = '22023';
  end if;

  select base_role, account_status
  into previous_role, previous_status
  from public.profiles
  where id = target_user_id;

  if not found then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;

  update public.profiles
  set base_role = new_base_role,
      account_status = new_account_status
  where id = target_user_id;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, before_data, after_data)
  values (
    (select auth.uid()),
    'profile.access_updated',
    'profile',
    target_user_id,
    jsonb_build_object('base_role', previous_role, 'account_status', previous_status),
    jsonb_build_object('base_role', new_base_role, 'account_status', new_account_status)
  );
end;
$$;

revoke all on function public.admin_set_profile_access(uuid, text, text) from public, anon, authenticated;
grant execute on function public.admin_set_profile_access(uuid, text, text) to authenticated;

-- El usuario común conserva únicamente su UPDATE autorizado de display_name.
-- Los nuevos campos no se agregan a sus grants de escritura.
