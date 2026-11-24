-- Fase 11: historial privado y minimizado de actividad del Cliente.

create table public.user_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  activity_type text not null check (
    activity_type in ('property_viewed', 'favorite_added', 'favorite_removed', 'inquiry_sent')
  ),
  property_id uuid references public.properties (id) on delete set null,
  activity_day date not null default (timezone('UTC', now())::date),
  created_at timestamptz not null default now()
);

create index user_activity_owner_created_idx on public.user_activity (user_id, created_at desc);
create index user_activity_property_idx on public.user_activity (property_id) where property_id is not null;
create unique index user_activity_property_view_daily_idx
  on public.user_activity (user_id, property_id, activity_day)
  where activity_type = 'property_viewed';

alter table public.user_activity enable row level security;
revoke all on table public.user_activity from public, anon, authenticated;
grant select on table public.user_activity to authenticated;

create policy user_activity_client_read_own
  on public.user_activity for select to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.profiles as profile
      where profile.id = (select auth.uid())
        and profile.base_role = 'client'
        and profile.account_status = 'active'
    )
  );

create or replace function public.record_customer_activity(
  target_activity_type text,
  target_property_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  utc_today date := (timezone('UTC', now()))::date;
  inserted_count integer := 0;
begin
  if actor_id is null
    or target_activity_type is null
    or target_property_id is null
    or target_activity_type not in ('property_viewed', 'favorite_added', 'favorite_removed', 'inquiry_sent') then
    return false;
  end if;

  perform 1 from public.profiles as profile
  where profile.id = actor_id
    and profile.base_role = 'client'
    and profile.account_status = 'active'
  for update;
  if not found then
    return false;
  end if;

  if not exists (
    select 1 from public.properties as property
    where property.id = target_property_id
      and property.publication_status = 'approved'
      and (
        property.visibility in ('public', 'both')
        or (property.visibility = 'premium' and private.has_active_premium_membership())
      )
  ) then
    return false;
  end if;

  if target_activity_type = 'favorite_added' and not exists (
    select 1 from public.favorites as favorite
    where favorite.user_id = actor_id and favorite.property_id = target_property_id
  ) then
    return false;
  end if;

  if target_activity_type = 'inquiry_sent' and not exists (
    select 1 from public.leads as lead
    where lead.customer_id = actor_id
      and lead.property_id = target_property_id
      and lead.created_at > now() - interval '10 minutes'
  ) then
    return false;
  end if;

  if target_activity_type = 'favorite_removed' and (
    select count(*) from public.user_activity as activity
    where activity.user_id = actor_id
      and activity.activity_type = 'favorite_removed'
      and activity.created_at > now() - interval '1 hour'
  ) >= 30 then
    return false;
  end if;

  if target_activity_type = 'property_viewed' then
    insert into public.user_activity (user_id, activity_type, property_id, activity_day)
    values (actor_id, target_activity_type, target_property_id, utc_today)
    on conflict (user_id, property_id, activity_day) where activity_type = 'property_viewed' do nothing;
    get diagnostics inserted_count = row_count;
  else
    insert into public.user_activity (user_id, activity_type, property_id, activity_day)
    values (actor_id, target_activity_type, target_property_id, utc_today);
    get diagnostics inserted_count = row_count;
  end if;

  delete from public.user_activity as activity
  where activity.id in (
    select stale.id from public.user_activity as stale
    where stale.user_id = actor_id
    order by stale.created_at desc
    offset 500
  );

  return inserted_count > 0;
end;
$$;

revoke all on function public.record_customer_activity(text, uuid) from public, anon;
grant execute on function public.record_customer_activity(text, uuid) to authenticated;
