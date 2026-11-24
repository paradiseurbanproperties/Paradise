-- Fase 8: planes y pagos Premium completamente simulados.
-- Esta migración nunca acepta ni almacena datos bancarios reales.

create table public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  description text not null default '',
  price numeric(10, 2) not null check (price >= 0),
  currency text not null default 'MXN' check (currency = 'MXN'),
  duration_days integer not null check (duration_days between 1 and 3650),
  benefits jsonb not null default '[]'::jsonb check (jsonb_typeof(benefits) = 'array'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete restrict,
  plan_id uuid not null references public.subscription_plans (id) on delete restrict,
  status text not null check (status in ('pending', 'active', 'expired', 'cancelled')),
  starts_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscriptions_valid_period check (
    (status = 'active' and starts_at is not null and expires_at is not null and expires_at > starts_at)
    or (status <> 'active' and (starts_at is null or expires_at is null or expires_at > starts_at))
  )
);

create table public.payment_simulations (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions (id) on delete restrict,
  user_id uuid not null references public.profiles (id) on delete restrict,
  result text not null check (result in ('succeeded', 'declined')),
  amount numeric(10, 2) not null check (amount >= 0),
  currency text not null default 'MXN' check (currency = 'MXN'),
  simulation_reference text not null unique,
  created_at timestamptz not null default now()
);

create index subscriptions_user_period_idx
  on public.subscriptions (user_id, starts_at desc, expires_at desc);
create index subscriptions_user_status_expiry_idx
  on public.subscriptions (user_id, status, expires_at desc);
create index payment_simulations_user_created_idx
  on public.payment_simulations (user_id, created_at desc);
create index payment_simulations_subscription_idx
  on public.payment_simulations (subscription_id, created_at desc);

create trigger subscription_plans_set_updated_at
  before update on public.subscription_plans
  for each row execute function public.set_updated_at();
create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

create or replace function private.audit_subscription_plan_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    insert into public.audit_logs (actor_id, action, entity_type, entity_id, before_data)
    values ((select auth.uid()), 'subscription_plan.deleted', 'subscription_plan', old.id, to_jsonb(old));
    return old;
  end if;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, before_data, after_data)
  values (
    (select auth.uid()),
    case when tg_op = 'INSERT' then 'subscription_plan.created' else 'subscription_plan.updated' end,
    'subscription_plan',
    new.id,
    case when tg_op = 'INSERT' then '{}'::jsonb else to_jsonb(old) end,
    to_jsonb(new)
  );
  return new;
end;
$$;

revoke all on function private.audit_subscription_plan_change() from public, anon, authenticated;

create trigger subscription_plans_audit_changes
  after insert or update or delete on public.subscription_plans
  for each row execute function private.audit_subscription_plan_change();

alter table public.subscription_plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payment_simulations enable row level security;

revoke all on table public.subscription_plans, public.subscriptions, public.payment_simulations
  from anon, authenticated;
grant select on table public.subscription_plans to anon, authenticated;
grant insert, update, delete on table public.subscription_plans to authenticated;
grant select on table public.subscriptions, public.payment_simulations to authenticated;

create policy subscription_plans_read_active
  on public.subscription_plans for select to anon, authenticated
  using (is_active);
create policy subscription_plans_admin_manage
  on public.subscription_plans for all to authenticated
  using ((select private.is_active_admin()))
  with check ((select private.is_active_admin()));

create policy subscriptions_read_owner_or_admin
  on public.subscriptions for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_active_admin()));
create policy payment_simulations_read_owner_or_admin
  on public.payment_simulations for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_active_admin()));

-- Entitlement calculado con el periodo vigente; no crea ni modifica rol Premium.
create or replace function private.has_active_premium_membership()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.subscriptions as subscription
    join public.profiles as profile on profile.id = subscription.user_id
    where subscription.user_id = (select auth.uid())
      and subscription.status = 'active'
      and subscription.starts_at <= now()
      and subscription.expires_at > now()
      and profile.base_role = 'client'
      and profile.account_status = 'active'
  );
$$;

revoke all on function private.has_active_premium_membership() from public, anon, authenticated;
-- También se permite al rol anon ejecutar el helper sin argumentos: auth.uid()
-- es NULL para visitantes, por lo que nunca concede acceso Premium.
-- El esquema privado solo otorga EXECUTE sobre este helper; los demás helpers
-- siguen sin privilegio de ejecución para anon.
grant usage on schema private to anon;
grant execute on function private.has_active_premium_membership() to anon, authenticated;

-- La UI puede elegir un resultado exclusivamente como escenario ficticio.
-- Esta función escribe suscripción, simulación y auditoría en una sola transacción.
create or replace function public.simulate_premium_checkout(
  selected_plan_id uuid,
  simulated_result text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_role text;
  actor_status text;
  plan_price numeric(10, 2);
  plan_currency text;
  plan_duration integer;
  next_start timestamptz;
  subscription_id uuid;
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

  if simulated_result is null or simulated_result not in ('succeeded', 'declined') then
    raise exception 'invalid_simulated_result' using errcode = '22023';
  end if;

  select price, currency, duration_days
    into plan_price, plan_currency, plan_duration
  from public.subscription_plans
  where id = selected_plan_id and is_active;

  if not found then
    raise exception 'active_plan_not_found' using errcode = 'P0002';
  end if;

  -- Serializa compras simultáneas del mismo usuario para encadenar renovaciones.
  perform pg_advisory_xact_lock(hashtextextended(actor_id::text, 0));

  if simulated_result = 'succeeded' then
    select greatest(coalesce(max(expires_at), now()), now())
      into next_start
    from public.subscriptions
    where user_id = actor_id
      and status = 'active'
      and expires_at > now();
  end if;

  insert into public.subscriptions (user_id, plan_id, status, starts_at, expires_at)
  values (
    actor_id,
    selected_plan_id,
    case when simulated_result = 'succeeded' then 'active' else 'pending' end,
    next_start,
    case when simulated_result = 'succeeded'
      then next_start + make_interval(days => plan_duration)
      else null
    end
  )
  returning id into subscription_id;

  insert into public.payment_simulations (
    subscription_id, user_id, result, amount, currency, simulation_reference
  )
  values (
    subscription_id,
    actor_id,
    simulated_result,
    plan_price,
    plan_currency,
    'SIM-' || replace(gen_random_uuid()::text, '-', '')
  );

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, after_data)
  values (
    actor_id,
    'premium.payment_simulated',
    'subscription',
    subscription_id,
    jsonb_build_object(
      'result', simulated_result,
      'plan_id', selected_plan_id,
      'amount', plan_price,
      'currency', plan_currency
    )
  );

  return subscription_id;
end;
$$;

revoke all on function public.simulate_premium_checkout(uuid, text) from public, anon, authenticated;
grant execute on function public.simulate_premium_checkout(uuid, text) to authenticated;

-- La RPC espacial también puede devolver visibilidad Premium al titular vigente.
-- Conserva SECURITY INVOKER para que RLS siga filtrando las filas.
create or replace function public.search_public_properties_nearby(
  center_latitude double precision,
  center_longitude double precision,
  radius_meters integer default 5000,
  result_limit integer default 60
)
returns setof public.properties
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if center_latitude is null or center_latitude not between -90 and 90
    or center_longitude is null or center_longitude not between -180 and 180 then
    raise exception 'invalid_coordinates' using errcode = '22023';
  end if;
  if radius_meters is null or radius_meters < 100 or radius_meters > 50000 then
    raise exception 'invalid_radius' using errcode = '22023';
  end if;
  if result_limit is null or result_limit < 1 or result_limit > 100 then
    raise exception 'invalid_limit' using errcode = '22023';
  end if;

  return query
    select property.*
    from public.properties as property
    where property.location is not null
      and property.publication_status = 'approved'
      and (
        property.visibility in ('public', 'both')
        or (
          property.visibility = 'premium'
          and (select private.has_active_premium_membership())
        )
      )
      and extensions.st_dwithin(
        property.location,
        extensions.st_point(center_longitude, center_latitude)::extensions.geography,
        radius_meters
      )
    order by extensions.st_distance(
      property.location,
      extensions.st_point(center_longitude, center_latitude)::extensions.geography
    ), property.id
    limit result_limit;
end;
$$;

revoke all on function public.search_public_properties_nearby(double precision, double precision, integer, integer)
  from public;
grant execute on function public.search_public_properties_nearby(double precision, double precision, integer, integer)
  to anon, authenticated;

create policy properties_premium_member_read
  on public.properties for select to authenticated
  using (
    publication_status = 'approved'
    and visibility in ('premium', 'both')
    and (select private.has_active_premium_membership())
  );

create policy property_images_premium_member_read
  on public.property_images for select to authenticated
  using (
    exists (
      select 1 from public.properties as property
      where property.id = property_id
        and property.publication_status = 'approved'
        and property.visibility in ('premium', 'both')
        and (select private.has_active_premium_membership())
    )
  );

create policy property_feature_values_premium_member_read
  on public.property_feature_values for select to authenticated
  using (
    exists (
      select 1 from public.properties as property
      where property.id = property_id
        and property.publication_status = 'approved'
        and property.visibility in ('premium', 'both')
        and (select private.has_active_premium_membership())
    )
  );

create policy property_images_storage_premium_member_read
  on storage.objects for select to authenticated
  using (
    bucket_id = 'property-images'
    and exists (
      select 1
      from public.property_images as image
      join public.properties as property on property.id = image.property_id
      where image.storage_path = name
        and property.publication_status = 'approved'
        and property.visibility in ('premium', 'both')
        and (select private.has_active_premium_membership())
    )
  );

-- Plan de demostración ficticio. Admin puede cambiar precio/duración o desactivarlo.
insert into public.subscription_plans (slug, name, description, price, currency, duration_days, benefits)
values (
  'premium-mensual',
  'Premium mensual',
  'Plan académico con acceso a publicaciones exclusivas.',
  299.00,
  'MXN',
  30,
  '["Acceso a propiedades exclusivas", "Distintivo Premium en el perfil"]'::jsonb
)
on conflict (slug) do nothing;
