-- Fase 10: captación de consultas y CRM mínimo para Admin y agentes asignados.

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties (id) on delete set null,
  assigned_agent_id uuid references public.profiles (id) on delete set null,
  customer_id uuid references public.profiles (id) on delete set null,
  contact_name text not null check (char_length(btrim(contact_name)) between 2 and 120),
  contact_email text not null check (char_length(contact_email) between 3 and 254),
  message text not null check (char_length(btrim(message)) between 5 and 2000),
  stage text not null default 'new'
    check (stage in ('new', 'contacted', 'interested', 'visit_scheduled', 'negotiation', 'closed', 'lost')),
  source text not null default 'property_inquiry' check (source in ('property_inquiry', 'admin')),
  privacy_consent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index leads_assigned_stage_created_idx
  on public.leads (assigned_agent_id, stage, created_at desc);
create index leads_property_created_idx on public.leads (property_id, created_at desc);
create index leads_email_property_created_idx
  on public.leads (lower(contact_email), property_id, created_at desc);

create table public.lead_interactions (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  actor_id uuid not null references public.profiles (id) on delete restrict,
  kind text not null default 'note' check (kind in ('note', 'call', 'email', 'meeting')),
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index lead_interactions_lead_created_idx on public.lead_interactions (lead_id, created_at desc);

create table public.lead_stage_history (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  previous_stage text check (previous_stage is null or previous_stage in ('new', 'contacted', 'interested', 'visit_scheduled', 'negotiation', 'closed', 'lost')),
  new_stage text not null check (new_stage in ('new', 'contacted', 'interested', 'visit_scheduled', 'negotiation', 'closed', 'lost')),
  actor_id uuid references public.profiles (id) on delete set null,
  changed_at timestamptz not null default now()
);

create index lead_stage_history_lead_changed_idx on public.lead_stage_history (lead_id, changed_at desc);

create trigger leads_set_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

create or replace function private.record_lead_stage_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.lead_stage_history (lead_id, previous_stage, new_stage, actor_id)
    values (new.id, null, new.stage, (select auth.uid()));
  elsif new.stage is distinct from old.stage then
    insert into public.lead_stage_history (lead_id, previous_stage, new_stage, actor_id)
    values (new.id, old.stage, new.stage, (select auth.uid()));
  end if;
  return new;
end;
$$;

revoke all on function private.record_lead_stage_history() from public, anon, authenticated;

create trigger leads_stage_history
  after insert or update of stage on public.leads
  for each row execute function private.record_lead_stage_history();

create or replace function public.submit_property_inquiry(
  target_property_id uuid,
  sender_name text,
  sender_email text,
  inquiry_message text,
  privacy_consent boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_email text := lower(btrim(sender_email));
  normalized_name text := btrim(sender_name);
  normalized_message text := btrim(inquiry_message);
  assigned_agent uuid;
  authenticated_customer uuid := (select auth.uid());
  new_lead_id uuid;
  recent_count integer;
begin
  if privacy_consent is distinct from true then
    raise exception 'privacy_consent_required' using errcode = '22023';
  end if;
  if normalized_name is null
    or char_length(normalized_name) not between 2 and 120
    or normalized_email is null
    or char_length(normalized_email) not between 3 and 254
    or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or normalized_message is null
    or char_length(normalized_message) not between 5 and 2000 then
    raise exception 'invalid_inquiry' using errcode = '22023';
  end if;
  if authenticated_customer is not null and not exists (
    select 1 from public.profiles as profile
    where profile.id = authenticated_customer
      and profile.account_status = 'active'
      and profile.base_role = 'client'
  ) then
    raise exception 'active_client_required' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.properties as property
    where property.id = target_property_id
      and property.publication_status = 'approved'
      and property.status = 'available'
      and (
        property.visibility in ('public', 'both')
        or (property.visibility = 'premium' and (select private.has_active_premium_membership()))
      )
  ) then
    raise exception 'property_not_available_for_inquiry' using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(target_property_id::text || ':' || normalized_email, 0)
  );
  select count(*) into recent_count
  from public.leads as lead
  where lead.property_id = target_property_id
    and lower(lead.contact_email) = normalized_email
    and lead.created_at > now() - interval '1 hour';
  if recent_count >= 3 then
    raise exception 'inquiry_rate_limited' using errcode = '22023';
  end if;

  select assignment.agent_id into assigned_agent
  from public.agent_assignments as assignment
  join public.profiles as profile on profile.id = assignment.agent_id
  where assignment.property_id = target_property_id
    and assignment.revoked_at is null
    and profile.base_role = 'agent'
    and profile.account_status = 'active'
  order by assignment.assigned_at asc, assignment.id asc
  limit 1;

  insert into public.leads (
    property_id, assigned_agent_id, customer_id, contact_name, contact_email, message, stage, source
  ) values (
    target_property_id,
    assigned_agent,
    authenticated_customer,
    normalized_name,
    normalized_email,
    normalized_message,
    'new',
    'property_inquiry'
  ) returning id into new_lead_id;

  return new_lead_id;
end;
$$;

revoke all on function public.submit_property_inquiry(uuid, text, text, text, boolean) from public, anon, authenticated;
grant execute on function public.submit_property_inquiry(uuid, text, text, text, boolean) to anon, authenticated;

alter table public.leads enable row level security;
alter table public.lead_interactions enable row level security;
alter table public.lead_stage_history enable row level security;

revoke all on table public.leads, public.lead_interactions, public.lead_stage_history from public, anon, authenticated;
grant select on table public.leads, public.lead_interactions, public.lead_stage_history to authenticated;
grant update (stage) on table public.leads to authenticated;
grant insert on table public.lead_interactions to authenticated;

create policy leads_admin_read
  on public.leads for select to authenticated
  using ((select private.is_active_admin()));
create policy leads_assigned_agent_read
  on public.leads for select to authenticated
  using (
    assigned_agent_id = (select auth.uid())
    and (select private.is_active_agent(assigned_agent_id))
  );
create policy leads_admin_update_stage
  on public.leads for update to authenticated
  using ((select private.is_active_admin()))
  with check ((select private.is_active_admin()));
create policy leads_assigned_agent_update_stage
  on public.leads for update to authenticated
  using (
    assigned_agent_id = (select auth.uid())
    and (select private.is_active_agent(assigned_agent_id))
  )
  with check (
    assigned_agent_id = (select auth.uid())
    and (select private.is_active_agent(assigned_agent_id))
  );

create policy lead_interactions_read
  on public.lead_interactions for select to authenticated
  using (exists (
    select 1 from public.leads as lead
    where lead.id = lead_interactions.lead_id
  ));
create policy lead_interactions_insert
  on public.lead_interactions for insert to authenticated
  with check (
    actor_id = (select auth.uid())
    and exists (
      select 1 from public.leads as lead
      where lead.id = lead_interactions.lead_id
    )
  );

create policy lead_stage_history_read
  on public.lead_stage_history for select to authenticated
  using (exists (
    select 1 from public.leads as lead
    where lead.id = lead_stage_history.lead_id
  ));
