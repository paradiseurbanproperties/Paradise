-- Fase 8: cancelación de suscripción Premium simulada.
-- No hay reembolsos ni datos bancarios; solo cambia el estado de vigencia.

create or replace function public.cancel_own_premium_subscription()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_role text;
  actor_status text;
  cancelled_count integer := 0;
  cancelled_subscription_id uuid;
begin
  if actor_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  select base_role, account_status
    into actor_role, actor_status
  from public.profiles
  where id = actor_id;

  if actor_role is distinct from 'client' or actor_status is distinct from 'active' then
    raise exception 'active_client_required' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(actor_id::text, 0));

  for cancelled_subscription_id in
    update public.subscriptions
    set status = 'cancelled'
    where user_id = actor_id
      and status = 'active'
      and expires_at > now()
    returning id
  loop
    cancelled_count := cancelled_count + 1;

    insert into public.audit_logs (actor_id, action, entity_type, entity_id, after_data)
    values (
      actor_id,
      'premium.subscription_cancelled',
      'subscription',
      cancelled_subscription_id,
      jsonb_build_object('status', 'cancelled', 'simulated', true)
    );
  end loop;

  if cancelled_count = 0 then
    raise exception 'no_active_subscription' using errcode = 'P0002';
  end if;

  return cancelled_count;
end;
$$;

revoke all on function public.cancel_own_premium_subscription() from public, anon, authenticated;
grant execute on function public.cancel_own_premium_subscription() to authenticated;

create or replace function public.admin_cancel_premium_subscription(target_subscription_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_status text;
  current_user_id uuid;
  current_expires timestamptz;
begin
  if (select auth.uid()) is null or not (select private.is_active_admin()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if target_subscription_id is null then
    raise exception 'invalid_subscription' using errcode = '22023';
  end if;

  select status, user_id, expires_at
    into current_status, current_user_id, current_expires
  from public.subscriptions
  where id = target_subscription_id;

  if not found then
    raise exception 'subscription_not_found' using errcode = 'P0002';
  end if;

  if current_status is distinct from 'active' or current_expires is null or current_expires <= now() then
    raise exception 'subscription_not_cancellable' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(current_user_id::text, 0));

  update public.subscriptions
  set status = 'cancelled'
  where id = target_subscription_id
    and status = 'active'
    and expires_at > now();

  if not found then
    raise exception 'subscription_not_cancellable' using errcode = '22023';
  end if;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, before_data, after_data)
  values (
    (select auth.uid()),
    'premium.subscription_cancelled_by_admin',
    'subscription',
    target_subscription_id,
    jsonb_build_object('status', current_status, 'user_id', current_user_id),
    jsonb_build_object('status', 'cancelled', 'simulated', true)
  );
end;
$$;

revoke all on function public.admin_cancel_premium_subscription(uuid) from public, anon, authenticated;
grant execute on function public.admin_cancel_premium_subscription(uuid) to authenticated;
