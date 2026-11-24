import Link from "next/link";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/navigation/site-header";
import { AdminAgentProfileForm } from "@/features/agents/components/admin-agent-profile-form";
import { AgentAssignmentControls } from "@/features/agents/components/agent-assignment-controls";
import { listAdminAgentAccounts } from "@/features/agents/repositories/agent-repository";
import { requireProfileRole } from "@/lib/permissions/access";

export const metadata = { title: "Perfiles de agentes" };

export default async function AdminAgentsPage() {
  await requireProfileRole(["admin"]);
  const { accounts, assignableProperties, unavailable } = await listAdminAgentAccounts();

  return (
    <div className="site-frame">
      <SiteHeader />
      <main className="site-main agent-admin-main" id="main-content">
        <div className="agent-admin-content">
          <header className="agent-admin-heading">
            <p className="eyebrow">Administración · Equipo</p>
            <h1>Perfiles de agentes</h1>
            <p>Prepara la información profesional y controla qué perfiles aparecen en el directorio público.</p>
            <Link className="text-link" href="/agentes">Ver directorio público →</Link>
          </header>
          {unavailable ? (
            <section className="agent-admin-notice" role="alert">
              <h2>No se pudieron cargar los perfiles</h2>
              <p>Comprueba que la migración 0011 esté aplicada y que Supabase responda.</p>
            </section>
          ) : accounts.length ? (
            <section aria-label="Cuentas de agente" className="agent-admin-list">
              {accounts.map((account) => (
                <article className="agent-admin-card" key={account.id}>
                  <AdminAgentProfileForm
                    accountStatus={account.accountStatus}
                    displayName={account.displayName}
                    profile={account.agentProfile}
                    profileId={account.id}
                  />
                  {account.accountStatus === "active" ? (
                    <AgentAssignmentControls
                      agentId={account.id}
                      assignments={account.assignments}
                      properties={assignableProperties}
                    />
                  ) : <p className="agent-assignment-manager__empty">La cuenta está suspendida; reactívala antes de gestionar asignaciones.</p>}
                </article>
              ))}
            </section>
          ) : (
            <section className="agent-admin-notice">
              <h2>Aún no hay cuentas de agente</h2>
              <p>Asigna el rol Agente a una cuenta existente desde Usuarios y permisos. Después podrás crear su perfil profesional aquí.</p>
              <Link className="button button--secondary button--small" href="/admin/usuarios">Abrir usuarios y permisos</Link>
            </section>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
