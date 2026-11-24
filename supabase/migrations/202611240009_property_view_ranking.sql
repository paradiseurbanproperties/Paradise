-- Fase 9: ranking agregado de fichas vistas para el dashboard administrativo.

create or replace function public.admin_property_view_top_properties(
  range_start date,
  range_end date,
  result_limit integer default 10
)
returns table (
  property_id uuid,
  property_title text,
  property_slug text,
  view_count bigint
)
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
    or range_start < utc_today - 89
    or result_limit is null
    or result_limit < 1
    or result_limit > 20 then
    raise exception 'invalid_report_parameters' using errcode = '22023';
  end if;

  return query
    select property.id, property.title, property.slug, count(*)::bigint
    from public.property_view_events as view_event
    join public.properties as property on property.id = view_event.property_id
    where view_event.viewed_on between range_start and range_end
    group by property.id, property.title, property.slug
    order by count(*) desc, property.title asc
    limit result_limit;
end;
$$;

revoke all on function public.admin_property_view_top_properties(date, date, integer) from public, anon, authenticated;
grant execute on function public.admin_property_view_top_properties(date, date, integer) to authenticated;
