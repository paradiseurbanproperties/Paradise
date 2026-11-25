-- Fase 7: solicitudes de visita, agenda y estados con auditoría de cambios.
create table public.visit_requests (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete restrict,
  client_id uuid not null references public.profiles (id) on delete restrict,
  assigned_agent_id uuid references public.profiles (id) on delete set null,
  contact_name text not null check (char_length(btrim(contact_name)) between 2 and 120),
  contact_email text not null check (char_length(contact_email) between 3 and 254),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'requested'
    check (status in ('requested', 'confirmed', 'declined', 'cancelled', 'completed', 'no_show')),
  message text not null default '' check (char_length(btrim(message)) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint visit_requests_valid_interval check (
    ends_at > starts_at and ends_at - starts_at = interval '1 hour'
  )
);

create index visit_requests_client_start_idx on public.visit_requests (client_id, starts_at desc);
create index visit_requests_agent_start_idx on public.visit_requests (assigned_agent_id, starts_at)
  where assigned_agent_id is not null;
create index visit_requests_property_start_idx on public.visit_requests (property_id, starts_at);

create table public.visit_request_history (
  id uuid primary key default gen_random_uuid(),
  visit_request_id uuid not null references public.visit_requests (id) on delete cascade,
  previous_status text check (previous_status is null or previous_status in ('requested', 'confirmed', 'declined', 'cancelled', 'completed', 'no_show')),
  new_status text not null check (new_status in ('requested', 'confirmed', 'declined', 'cancelled', 'completed', 'no_show')),
  previous_starts_at timestamptz,
  new_starts_at timestamptz not null,
  actor_id uuid references public.profiles (id) on delete set null,
  changed_at timestamptz not null default now()
);
create index visit_request_history_visit_changed_idx
  on public.visit_request_history (visit_request_id, changed_at desc);

create trigger visit_requests_set_updated_at
  before update on public.visit_requests
  for each row execute function public.set_updated_at();

create or replace function private.record_visit_request_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.visit_request_history (visit_request_id, previous_status, new_status, previous_starts_at, new_starts_at, actor_id)
    values (new.id, null, new.status, null, new.starts_at, (select auth.uid()));
  elsif new.status is distinct from old.status or new.starts_at is distinct from old.starts_at then
    insert into public.visit_request_history (visit_request_id, previous_status, new_status, previous_starts_at, new_starts_at, actor_id)
    values (new.id, old.status, new.status, old.starts_at, new.starts_at, (select auth.uid()));
  end if;
  return new;
end;
$$;
revoke all on function private.record_visit_request_history() from public, anon, authenticated;
create trigger visit_requests_record_history
  after insert or update of status, starts_at on public.visit_requests
  for each row execute function private.record_visit_request_history();

alter table public.visit_requests enable row level security;
alter table public.visit_request_history enable row level security;
revoke all on table public.visit_requests, public.visit_request_history from public, anon, authenticated;
grant select on table public.visit_requests, public.visit_request_history to authenticated;

create policy visit_requests_client_read_own
  on public.visit_requests for select to authenticated
  using (
    client_id = (select auth.uid())
    and exists (
      select 1 from public.profiles as profile
      where profile.id = (select auth.uid())
        and profile.base_role = 'client' and profile.account_status = 'active'
    )
  );
create policy visit_requests_agent_read_assigned
  on public.visit_requests for select to authenticated
  using (
    assigned_agent_id = (select auth.uid())
    and (select private.is_active_agent((select auth.uid())))
    and exists (
      select 1 from public.agent_assignments as assignment
      where assignment.property_id = visit_requests.property_id
        and assignment.agent_id = (select auth.uid())
        and assignment.revoked_at is null
    )
  );
create policy visit_requests_admin_read
  on public.visit_requests for select to authenticated
  using ((select private.is_active_admin()));

create policy visit_request_history_read_authorized
  on public.visit_request_history for select to authenticated
  using (exists (
    select 1 from public.visit_requests as visit
    where visit.id = visit_request_id
      and (
        visit.client_id = (select auth.uid())
        or visit.assigned_agent_id = (select auth.uid()) and (select private.is_active_agent((select auth.uid())))
        or (select private.is_active_admin())
      )
  ));

create or replace function public.request_property_visit(
  target_property_id uuid,
  proposed_starts_at timestamptz,
  client_message text default ''
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  client_name text;
  client_email text := lower(btrim((select auth.jwt() ->> 'email')));
  target_agent uuid;
  new_visit_id uuid;
  recent_requests integer;
  normalized_message text := btrim(coalesce(client_message, ''));
begin
  if actor_id is null then raise exception 'active_client_required' using errcode = '42501'; end if;
  select profile.display_name into client_name
  from public.profiles as profile
  where profile.id = actor_id and profile.base_role = 'client' and profile.account_status = 'active';
  if not found then raise exception 'active_client_required' using errcode = '42501'; end if;
  if client_name is null or char_length(btrim(client_name)) not between 2 and 120
    or client_email is null or char_length(client_email) not between 3 and 254
    or client_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'valid_client_contact_required' using errcode = '22023';
  end if;
  if proposed_starts_at is null or proposed_starts_at < now() + interval '2 hours'
    or proposed_starts_at > now() + interval '90 days' then
    raise exception 'visit_time_out_of_range' using errcode = '22023';
  end if;
  if char_length(normalized_message) > 1000 then
    raise exception 'visit_message_too_long' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.properties as property
    where property.id = target_property_id
      and property.publication_status = 'approved' and property.status = 'available'
      and property.slug not like 'demo-%'
      and property.description not like 'FICHA DE DEMOSTRACIÓN.%'
      and (property.visibility in ('public', 'both')
        or property.visibility = 'premium' and (select private.has_active_premium_membership()))
  ) then raise exception 'property_not_available_for_visit' using errcode = '42501'; end if;

  select assignment.agent_id into target_agent
  from public.agent_assignments as assignment
  where assignment.property_id = target_property_id and assignment.revoked_at is null
    and (select private.is_active_agent(assignment.agent_id))
  order by assignment.assigned_at, assignment.id limit 1;

  -- Serialize scheduling writes so concurrent requests/confirmations cannot double-book.
  perform pg_catalog.pg_advisory_xact_lock(20261125, 24001);
  select count(*) into recent_requests from public.visit_requests as visit
  where visit.client_id = actor_id and visit.created_at > now() - interval '24 hours'
    and visit.status in ('requested', 'confirmed');
  if recent_requests >= 5 then raise exception 'visit_request_rate_limited' using errcode = '22023'; end if;
  if exists (
    select 1 from public.visit_requests as visit
    where visit.status in ('requested', 'confirmed')
      and visit.starts_at < proposed_starts_at + interval '1 hour'
      and visit.ends_at > proposed_starts_at
      and (visit.property_id = target_property_id
        or target_agent is not null and visit.assigned_agent_id = target_agent)
  ) then raise exception 'visit_time_unavailable' using errcode = '23P01'; end if;

  insert into public.visit_requests (
    property_id, client_id, assigned_agent_id, contact_name, contact_email,
    starts_at, ends_at, message
  ) values (
    target_property_id, actor_id, target_agent, btrim(client_name), client_email,
    proposed_starts_at, proposed_starts_at + interval '1 hour', normalized_message
  ) returning id into new_visit_id;
  return new_visit_id;
end;
$$;

create or replace function public.change_property_visit(
  target_visit_id uuid,
  next_status text,
  replacement_starts_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_role text;
  visit_row public.visit_requests%rowtype;
  effective_starts_at timestamptz;
begin
  select profile.base_role into actor_role from public.profiles as profile
  where profile.id = actor_id and profile.account_status = 'active'
    and profile.base_role in ('agent', 'admin');
  if not found then raise exception 'team_role_required' using errcode = '42501'; end if;

  perform pg_catalog.pg_advisory_xact_lock(20261125, 24001);
  select * into visit_row from public.visit_requests where id = target_visit_id for update;
  if not found then raise exception 'visit_not_found' using errcode = 'P0002'; end if;
  if actor_role = 'agent' and (
    visit_row.assigned_agent_id is distinct from actor_id
    or not (select private.is_active_agent(actor_id))
    or not exists (
      select 1 from public.agent_assignments as assignment
      where assignment.property_id = visit_row.property_id
        and assignment.agent_id = actor_id
        and assignment.revoked_at is null
    )
  ) then raise exception 'assigned_agent_required' using errcode = '42501'; end if;

  if next_status is null or next_status not in ('confirmed', 'declined', 'cancelled', 'completed', 'no_show') then
    raise exception 'invalid_visit_status' using errcode = '22023';
  end if;
  if visit_row.status = 'requested' and next_status not in ('confirmed', 'declined', 'cancelled')
    or visit_row.status = 'confirmed' and next_status not in ('confirmed', 'cancelled', 'completed', 'no_show')
    or visit_row.status not in ('requested', 'confirmed') then
    raise exception 'invalid_visit_transition' using errcode = '22023';
  end if;
  effective_starts_at := coalesce(replacement_starts_at, visit_row.starts_at);
  if replacement_starts_at is not null and (
    replacement_starts_at < now() + interval '2 hours'
    or replacement_starts_at > now() + interval '90 days'
  ) then raise exception 'visit_time_out_of_range' using errcode = '22023'; end if;
  if next_status = 'completed' and visit_row.starts_at > now() then
    raise exception 'visit_not_started' using errcode = '22023';
  end if;
  if next_status = 'no_show' and visit_row.ends_at > now() then
    raise exception 'visit_not_finished' using errcode = '22023';
  end if;
  if next_status in ('requested', 'confirmed') then
    if exists (
      select 1 from public.visit_requests as other
      where other.id <> visit_row.id and other.status in ('requested', 'confirmed')
        and other.starts_at < effective_starts_at + interval '1 hour'
        and other.ends_at > effective_starts_at
        and (other.property_id = visit_row.property_id
          or visit_row.assigned_agent_id is not null and other.assigned_agent_id = visit_row.assigned_agent_id)
    ) then raise exception 'visit_time_unavailable' using errcode = '23P01'; end if;
  end if;

  update public.visit_requests set status = next_status,
    starts_at = effective_starts_at, ends_at = effective_starts_at + interval '1 hour'
  where id = visit_row.id;
  return visit_row.id;
end;
$$;

create or replace function public.cancel_own_property_visit(target_visit_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  visit_row public.visit_requests%rowtype;
begin
  if not exists (select 1 from public.profiles as profile where profile.id = actor_id and profile.base_role = 'client' and profile.account_status = 'active') then
    raise exception 'active_client_required' using errcode = '42501';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(20261125, 24001);
  select * into visit_row from public.visit_requests where id = target_visit_id and client_id = actor_id for update;
  if not found then raise exception 'visit_not_found' using errcode = 'P0002'; end if;
  if visit_row.status not in ('requested', 'confirmed') or visit_row.starts_at <= now() then
    raise exception 'visit_cannot_be_cancelled' using errcode = '22023';
  end if;
  update public.visit_requests set status = 'cancelled' where id = visit_row.id;
  return visit_row.id;
end;
$$;

revoke all on function public.request_property_visit(uuid, timestamptz, text) from public, anon, authenticated;
revoke all on function public.change_property_visit(uuid, text, timestamptz) from public, anon, authenticated;
revoke all on function public.cancel_own_property_visit(uuid) from public, anon, authenticated;
grant execute on function public.request_property_visit(uuid, timestamptz, text) to authenticated;
grant execute on function public.change_property_visit(uuid, text, timestamptz) to authenticated;
grant execute on function public.cancel_own_property_visit(uuid) to authenticated;
