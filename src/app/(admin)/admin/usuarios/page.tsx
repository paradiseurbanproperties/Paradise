import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/navigation/site-header";
import { AccountAccessForm } from "@/features/users/components/account-access-form";
import { requireProfileRole } from "@/lib/permissions/access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PROFILE_ROLES, type AccountStatus, type ProfileRole } from "@/constants/access";

export const metadata = { title: "Usuarios y permisos" };

const roleLabels: Record<ProfileRole, string> = {
  client: "Cliente",
  agent: "Agente",
  admin: "Administrador",
};

const statusLabels: Record<AccountStatus, string> = {
  active: "Activa",
  suspended: "Suspendida",
};

export default async function AdminUsersPage() {
  const currentAdmin = await requireProfileRole(["admin"]);
  const supabase = await createSupabaseServerClient();
  const [{ data: profiles, error: profilesError }, { data: auditLogs, error: auditError }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, base_role, account_status, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("audit_logs")
      .select("id, actor_id, action, entity_id, before_data, after_data, created_at")
      .eq("entity_type", "profile")
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  return (
    <div className="site-frame">
      <SiteHeader />
      <main className="site-main admin-users-main" id="main-content">
        <div className="admin-users-content">
          <header className="admin-users-heading">
            <p className="eyebrow">Administración · Acceso</p>
            <h1>Usuarios y permisos</h1>
            <p>Los cambios de rol y estado se validan en el servidor y quedan registrados en auditoría.</p>
          </header>

          <section aria-labelledby="profiles-heading" className="admin-users-panel">
            <div className="admin-users-panel__heading">
              <div>
                <p className="eyebrow">Cuentas</p>
                <h2 id="profiles-heading">Perfiles registrados</h2>
              </div>
              <span className="admin-users-count">{profiles?.length ?? 0}</span>
            </div>
            {profilesError ? (
              <p className="admin-users-empty" role="alert">No se pudieron cargar los perfiles.</p>
            ) : profiles?.length ? (
              <div className="admin-users-list">
                {profiles.map((profile) => {
                  const role = PROFILE_ROLES.includes(profile.base_role as ProfileRole)
                    ? profile.base_role as ProfileRole
                    : "client";
                  const status: AccountStatus = profile.account_status === "suspended" ? "suspended" : "active";

                  return (
                    <article className="admin-user-row" key={profile.id}>
                      <div className="admin-user-row__identity">
                        <span aria-hidden="true" className="admin-user-row__avatar">
                          {(profile.display_name.trim()[0] || "P").toUpperCase()}
                        </span>
                        <div>
                          <h3>{profile.display_name || "Cuenta sin nombre"}</h3>
                          <p>{profile.id}</p>
                          <span className={`admin-user-row__status admin-user-row__status--${status}`}>
                            {statusLabels[status]}
                          </span>
                        </div>
                      </div>
                      <div className="admin-user-row__access">
                        <span className="admin-user-row__role">{roleLabels[role]}</span>
                        <AccountAccessForm
                          isSelf={profile.id === currentAdmin.userId}
                          role={role}
                          status={status}
                          userId={profile.id}
                        />
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="admin-users-empty">Aún no hay perfiles para mostrar.</p>
            )}
          </section>

          <section aria-labelledby="audit-heading" className="admin-users-panel">
            <div className="admin-users-panel__heading">
              <div>
                <p className="eyebrow">Trazabilidad</p>
                <h2 id="audit-heading">Cambios de acceso recientes</h2>
              </div>
            </div>
            {auditError ? (
              <p className="admin-users-empty" role="alert">No se pudo cargar la auditoría.</p>
            ) : auditLogs?.length ? (
              <ol className="access-audit-list">
                {auditLogs.map((entry) => (
                  <li className="access-audit-row" key={entry.id}>
                    <div>
                      <strong>Acceso de perfil actualizado</strong>
                      <p>Cuenta: {entry.entity_id} · Admin: {entry.actor_id ?? "registro del sistema"}</p>
                      <small>
                        {(entry.before_data as { base_role?: string }).base_role ?? "—"}
                        {" → "}
                        {(entry.after_data as { base_role?: string }).base_role ?? "—"}
                        {" · "}
                        {(entry.before_data as { account_status?: string }).account_status ?? "—"}
                        {" → "}
                        {(entry.after_data as { account_status?: string }).account_status ?? "—"}
                      </small>
                    </div>
                    <time dateTime={entry.created_at}>
                      {new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(new Date(entry.created_at))}
                    </time>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="admin-users-empty">Los cambios de roles y estados aparecerán aquí.</p>
            )}
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
