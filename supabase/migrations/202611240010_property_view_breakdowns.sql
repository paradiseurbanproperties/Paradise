-- Fase 9: desgloses agregados de vistas por tipo de inmueble y ciudad.

create or replace function public.admin_property_view_breakdowns(
  range_start date,
  range_end date
)
returns table (
  dimension text,
  label text,
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
    or range_start < utc_today - 89 then
    raise exception 'invalid_date_range' using errcode = '22023';
  end if;

  return query
    with type_counts as (
      select
        'tipo'::text as dimension,
        property.property_type::text as label,
        count(*)::bigint as view_count
      from public.property_view_events as view_event
      join public.properties as property on property.id = view_event.property_id
      where view_event.viewed_on between range_start and range_end
      group by property.property_type
    ), city_counts as (
      select
        'ciudad'::text as dimension,
        concat_ws(', ', property.city, property.state) as label,
        count(*)::bigint as view_count
      from public.property_view_events as view_event
      join public.properties as property on property.id = view_event.property_id
      where view_event.viewed_on between range_start and range_end
      group by property.city, property.state
      order by count(*) desc, property.city asc, property.state asc
      limit 10
    )
    select type_counts.dimension, type_counts.label, type_counts.view_count from type_counts
    union all
    select city_counts.dimension, city_counts.label, city_counts.view_count from city_counts
    order by 1, 3 desc, 2;
end;
$$;

revoke all on function public.admin_property_view_breakdowns(date, date) from public, anon, authenticated;
grant execute on function public.admin_property_view_breakdowns(date, date) to authenticated;
