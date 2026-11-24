-- Fase 14: una asignación conserva autoría y no se elimina físicamente.
drop policy if exists agent_assignments_admin_all on public.agent_assignments;

revoke all on table public.agent_assignments from public, anon, authenticated;
grant select on table public.agent_assignments to authenticated;
grant insert (property_id, agent_id, assigned_by) on table public.agent_assignments to authenticated;
grant update (revoked_at) on table public.agent_assignments to authenticated;

create policy agent_assignments_admin_read
  on public.agent_assignments for select to authenticated
  using ((select private.is_active_admin()));

create policy agent_assignments_admin_insert
  on public.agent_assignments for insert to authenticated
  with check (
    (select private.is_active_admin())
    and assigned_by = (select auth.uid())
    and revoked_at is null
    and exists (
      select 1 from public.profiles as agent
      where agent.id = agent_id
        and agent.base_role = 'agent'
        and agent.account_status = 'active'
    )
  );

create policy agent_assignments_admin_revoke
  on public.agent_assignments for update to authenticated
  using (
    (select private.is_active_admin())
    and revoked_at is null
  )
  with check (
    (select private.is_active_admin())
    and revoked_at is not null
  );

-- No DELETE policy or privilege: revocation is the only supported removal.
