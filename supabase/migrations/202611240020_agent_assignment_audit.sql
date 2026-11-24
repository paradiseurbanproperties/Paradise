-- Fase 14: auditar altas y revocaciones de asignaciones en la misma transacción.
create or replace function private.audit_agent_assignment_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
begin
  if tg_op = 'INSERT' then
    insert into public.audit_logs (actor_id, action, entity_type, entity_id, after_data)
    values (
      coalesce(actor_id, new.assigned_by),
      'agent_assignment.created',
      'agent_assignment',
      new.id,
      jsonb_build_object(
        'property_id', new.property_id,
        'agent_id', new.agent_id,
        'assigned_at', new.assigned_at
      )
    );
    return new;
  end if;

  if new.revoked_at is distinct from old.revoked_at and new.revoked_at is not null then
    insert into public.audit_logs (actor_id, action, entity_type, entity_id, before_data, after_data)
    values (
      actor_id,
      'agent_assignment.revoked',
      'agent_assignment',
      new.id,
      jsonb_build_object('revoked_at', old.revoked_at),
      jsonb_build_object(
        'revoked_at', new.revoked_at,
        'property_id', new.property_id,
        'agent_id', new.agent_id
      )
    );
  end if;
  return new;
end;
$$;

revoke all on function private.audit_agent_assignment_change() from public, anon, authenticated;
create trigger agent_assignments_audit_changes
  after insert or update on public.agent_assignments
  for each row execute function private.audit_agent_assignment_change();
