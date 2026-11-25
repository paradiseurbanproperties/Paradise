-- Fase 15: las visitas siguen la asignación vigente de la propiedad.
-- Una solicitud creada antes de asignar la propiedad a un agente también
-- debe aparecer en la agenda del agente que actualmente la atiende.
drop policy if exists visit_requests_agent_read_assigned on public.visit_requests;
create policy visit_requests_agent_read_assigned
  on public.visit_requests for select to authenticated
  using ((select private.is_assigned_agent(property_id)));

drop policy if exists visit_request_history_read_authorized on public.visit_request_history;
create policy visit_request_history_read_authorized
  on public.visit_request_history for select to authenticated
  using (exists (
    select 1 from public.visit_requests as visit
    where visit.id = visit_request_id
      and (
        visit.client_id = (select auth.uid())
        or (select private.is_assigned_agent(visit.property_id))
        or (select private.is_active_admin())
      )
  ));

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
  current_property_agent uuid;
  conflict_agent_id uuid;
begin
  select profile.base_role into actor_role from public.profiles as profile
  where profile.id = actor_id and profile.account_status = 'active'
    and profile.base_role in ('agent', 'admin');
  if not found then raise exception 'team_role_required' using errcode = '42501'; end if;

  perform pg_catalog.pg_advisory_xact_lock(20261125, 24001);
  select * into visit_row from public.visit_requests where id = target_visit_id for update;
  if not found then raise exception 'visit_not_found' using errcode = 'P0002'; end if;
  if actor_role = 'agent' and not (select private.is_assigned_agent(visit_row.property_id)) then
    raise exception 'assigned_agent_required' using errcode = '42501';
  end if;

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

  select assignment.agent_id into current_property_agent
  from public.agent_assignments as assignment
  where assignment.property_id = visit_row.property_id and assignment.revoked_at is null
    and (select private.is_active_agent(assignment.agent_id))
  order by assignment.assigned_at, assignment.id limit 1;
  conflict_agent_id := case
    when actor_role = 'agent' then actor_id
    else coalesce(current_property_agent, visit_row.assigned_agent_id)
  end;

  if next_status in ('requested', 'confirmed') then
    if exists (
      select 1 from public.visit_requests as other
      where other.id <> visit_row.id and other.status in ('requested', 'confirmed')
        and other.starts_at < effective_starts_at + interval '1 hour'
        and other.ends_at > effective_starts_at
        and (
          other.property_id = visit_row.property_id
          or conflict_agent_id is not null and (
            other.assigned_agent_id = conflict_agent_id
            or exists (
              select 1 from public.agent_assignments as assignment
              where assignment.property_id = other.property_id
                and assignment.agent_id = conflict_agent_id
                and assignment.revoked_at is null
            )
          )
        )
    ) then raise exception 'visit_time_unavailable' using errcode = '23P01'; end if;
  end if;

  update public.visit_requests set status = next_status,
    assigned_agent_id = case when actor_role = 'agent' then actor_id else assigned_agent_id end,
    starts_at = effective_starts_at, ends_at = effective_starts_at + interval '1 hour'
  where id = visit_row.id;
  return visit_row.id;
end;
$$;

revoke all on function public.change_property_visit(uuid, text, timestamptz) from public, anon, authenticated;
grant execute on function public.change_property_visit(uuid, text, timestamptz) to authenticated;
