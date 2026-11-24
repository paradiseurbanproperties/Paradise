-- Fase 12: notificaciones privadas dentro de la aplicación.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  notification_type text not null check (
    notification_type in ('premium_activated', 'premium_cancelled', 'inquiry_stage_changed')
  ),
  subscription_id uuid references public.subscriptions (id) on delete cascade,
  lead_id uuid references public.leads (id) on delete set null,
  lead_stage_history_id uuid references public.lead_stage_history (id) on delete set null,
  property_id uuid references public.properties (id) on delete set null,
  stage text check (stage is null or stage in ('new', 'contacted', 'interested', 'visit_scheduled', 'negotiation', 'closed', 'lost')),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint notifications_source_matches_type check (
    (notification_type in ('premium_activated', 'premium_cancelled') and subscription_id is not null and lead_stage_history_id is null)
    or (notification_type = 'inquiry_stage_changed' and subscription_id is null and lead_stage_history_id is not null and lead_id is not null)
  )
);

create index notifications_owner_created_idx on public.notifications (user_id, created_at desc);
create index notifications_owner_unread_idx on public.notifications (user_id, created_at desc) where read_at is null;
create unique index notifications_subscription_event_idx
  on public.notifications (subscription_id, notification_type)
  where subscription_id is not null;
create unique index notifications_lead_stage_event_idx
  on public.notifications (lead_stage_history_id)
  where lead_stage_history_id is not null;

alter table public.notifications enable row level security;
revoke all on table public.notifications from public, anon, authenticated;
grant select on table public.notifications to authenticated;
grant update (read_at) on table public.notifications to authenticated;

create policy notifications_client_read_own
  on public.notifications for select to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.profiles as profile
      where profile.id = (select auth.uid())
        and profile.base_role = 'client'
        and profile.account_status = 'active'
    )
  );

create policy notifications_client_mark_own
  on public.notifications for update to authenticated
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

create or replace function private.notify_customer_lead_stage_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_customer_id uuid;
  target_property_id uuid;
begin
  if new.previous_stage is null then
    return new;
  end if;

  select lead.customer_id, lead.property_id
    into target_customer_id, target_property_id
  from public.leads as lead
  where lead.id = new.lead_id;

  if target_customer_id is not null and exists (
    select 1 from public.profiles as profile
    where profile.id = target_customer_id
      and profile.base_role = 'client'
      and profile.account_status = 'active'
  ) then
    insert into public.notifications (
      user_id, notification_type, lead_id, lead_stage_history_id, property_id, stage
    ) values (
      target_customer_id, 'inquiry_stage_changed', new.lead_id, new.id, target_property_id, new.new_stage
    ) on conflict (lead_stage_history_id) where lead_stage_history_id is not null do nothing;
  end if;
  return new;
end;
$$;

revoke all on function private.notify_customer_lead_stage_change() from public, anon, authenticated;
create trigger lead_stage_history_notify_customer
  after insert on public.lead_stage_history
  for each row execute function private.notify_customer_lead_stage_change();

create or replace function private.notify_customer_subscription_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_type text;
begin
  if tg_op = 'INSERT' then
    if new.status = 'active' then
      target_type := 'premium_activated';
    end if;
  elsif old.status is distinct from new.status then
    if new.status = 'active' then
      target_type := 'premium_activated';
    elsif new.status = 'cancelled' then
      target_type := 'premium_cancelled';
    end if;
  end if;
  if target_type is null then return new; end if;

  if exists (
    select 1 from public.profiles as profile
    where profile.id = new.user_id
      and profile.base_role = 'client'
      and profile.account_status = 'active'
  ) then
    insert into public.notifications (user_id, notification_type, subscription_id)
    values (new.user_id, target_type, new.id)
    on conflict (subscription_id, notification_type) where subscription_id is not null do nothing;
  end if;
  return new;
end;
$$;

revoke all on function private.notify_customer_subscription_status() from public, anon, authenticated;
create trigger subscriptions_notify_customer
  after insert or update on public.subscriptions
  for each row execute function private.notify_customer_subscription_status();
