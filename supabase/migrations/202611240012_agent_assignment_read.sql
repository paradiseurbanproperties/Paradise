-- Fase 10: permitir lectura de asignaciones bajo RLS y ocultarlas a cuentas suspendidas.

grant select on table public.agent_assignments to authenticated;

drop policy if exists agent_assignments_agent_read_own on public.agent_assignments;
create policy agent_assignments_agent_read_own
  on public.agent_assignments for select to authenticated
  using (
    agent_id = (select auth.uid())
    and revoked_at is null
    and (select private.is_active_agent(agent_id))
  );
