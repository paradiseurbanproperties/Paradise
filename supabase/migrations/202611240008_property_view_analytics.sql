-- Fase 9: vistas de fichas públicas con identificador efímero de pestaña.
-- No se almacenan IP, usuario, agente de navegador, URL de origen ni términos de búsqueda.

create table public.property_view_events (
  id bigint generated always as identity primary key,
  property_id uuid not null references public.properties (id) on delete cascade,
  session_id uuid not null,
  viewed_on date not null default (timezone('UTC', now())::date),
  created_at timestamptz not null default now(),
  constraint property_view_events_one_per_session_day unique (property_id, viewed_on, session_id)
);

create index property_view_events_created_at_idx on public.property_view_events (created_at);
create index property_view_events_property_day_idx on public.property_view_events (property_id, viewed_on);

alter table public.property_view_events enable row level security;
revoke all on table public.property_view_events from public, anon, authenticated;
revoke all on sequence public.property_view_events_id_seq from public, anon, authenticated;

create or replace function public.record_public_property_view(
  target_property_id uuid,
  visitor_session_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  utc_today date := (timezone('UTC', now()))::date;
  inserted_count integer := 0;
begin
  if target_property_id is null or visitor_session_id is null then
    return false;
  end if;

  if not exists (
    select 1
    from public.properties as property
    where property.id = target_property_id
      and property.publication_status = 'approved'
      and (
        property.visibility in ('public', 'both')
        or (
          property.visibility = 'premium'
          and (select auth.uid()) is not null
          and (select private.has_active_premium_membership())
        )
      )
  ) then
    return false;
  end if;

  -- Serializa por sesión y día para que el límite no se pueda eludir con solicitudes paralelas.
  perform pg_advisory_xact_lock(hashtextextended(visitor_session_id::text || utc_today::text, 0));

  if (
    select count(*)
    from public.property_view_events as view_event
    where view_event.session_id = visitor_session_id
      and view_event.viewed_on = utc_today
  ) >= 30 then
    return false;
  end if;

  insert into public.property_view_events (property_id, session_id, viewed_on)
  values (target_property_id, visitor_session_id, utc_today)
  on conflict (property_id, viewed_on, session_id) do nothing;
  get diagnostics inserted_count = row_count;

  -- Limpieza oportunista cuando el lock global está libre, sin depender de cron externo.
  if pg_try_advisory_xact_lock(908240091::bigint) then
    delete from public.property_view_events
    where created_at < now() - interval '90 days';
  end if;

  return inserted_count = 1;
end;
$$;

revoke all on function public.record_public_property_view(uuid, uuid) from public, anon, authenticated;
grant execute on function public.record_public_property_view(uuid, uuid) to anon, authenticated;

create or replace function public.admin_property_view_daily_counts(
  range_start date,
  range_end date
)
returns table (view_date date, view_count bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  utc_today date := (timezone('UTC', now()))::date;
begin
  if (select auth.uid()) is null or not (select private.is_active_admin()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if range_start is null or range_end is null
    or range_start > range_end
    or range_end > utc_today
    or range_start < utc_today - 89 then
    raise exception 'invalid_date_range' using errcode = '22023';
  end if;

  return query
    select view_event.viewed_on, count(*)::bigint
    from public.property_view_events as view_event
    where view_event.viewed_on between range_start and range_end
    group by view_event.viewed_on
    order by view_event.viewed_on;
end;
$$;

revoke all on function public.admin_property_view_daily_counts(date, date) from public, anon, authenticated;
grant execute on function public.admin_property_view_daily_counts(date, date) to authenticated;
