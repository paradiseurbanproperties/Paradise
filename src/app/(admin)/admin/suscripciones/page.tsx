import Link from "next/link";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/navigation/site-header";
import { AdminCancelSubscriptionForm } from "@/features/subscriptions/components/admin-cancel-subscription-form";
import { AdminSubscriptionPlanForm } from "@/features/subscriptions/components/admin-subscription-plan-form";
import { PremiumHistoryList } from "@/features/subscriptions/components/premium-history-list";
import {
  listAdminSubscriptionPlans,
  listAdminSubscriptions,
} from "@/features/subscriptions/repositories/subscription-repository";
import { requireProfileRole } from "@/lib/permissions/access";

export const metadata = { title: "Planes y suscripciones" };

const statusLabels = {
  active: "Activa",
  pending: "Pendiente",
  expired: "Vencida",
  cancelled: "Cancelada",
} as const;

export default async function AdminSubscriptionsPage() {
  await requireProfileRole(["admin"]);
  const [planResult, subscriptions] = await Promise.all([
    listAdminSubscriptionPlans(),
    listAdminSubscriptions(),
  ]);

  return (
    <div className="site-frame">
      <SiteHeader />
      <main className="site-main admin-users-main" id="main-content">
        <div className="admin-users-content">
          <header className="admin-users-heading">
            <p className="eyebrow">Administración · Premium</p>
            <h1>Planes y suscripciones</h1>
            <p>Los precios son simulados. No se capturan datos bancarios ni se registran ingresos reales.</p>
            <p>
              <Link className="text-link" href="/admin/propiedades">← Inventario</Link>
              {" · "}
              <Link className="text-link" href="/admin/usuarios">Usuarios</Link>
            </p>
          </header>

          <section aria-labelledby="create-plan-heading" className="admin-users-panel">
            <div className="admin-users-panel__heading">
              <div>
                <p className="eyebrow">Catálogo de planes</p>
                <h2 id="create-plan-heading">Crear un plan</h2>
              </div>
            </div>
            <AdminSubscriptionPlanForm />
          </section>

          <section aria-labelledby="plans-heading" className="admin-users-panel">
            <div className="admin-users-panel__heading">
              <div>
                <p className="eyebrow">Planes existentes</p>
                <h2 id="plans-heading">Editar precio, duración y visibilidad</h2>
              </div>
              <span className="admin-users-count">{planResult.plans.length}</span>
            </div>
            {planResult.status !== "ready" ? (
              <p className="admin-users-empty" role="alert">
                {planResult.status === "not_configured"
                  ? "Configura Supabase para administrar planes."
                  : "No se pudieron leer los planes. Confirma que la migración 0006 está aplicada."}
              </p>
            ) : planResult.plans.length ? (
              <div className="admin-plan-list">
                {planResult.plans.map((plan) => (
                  <article className="admin-plan-row" key={plan.id}>
                    <div className="admin-plan-row__summary">
                      <h3>{plan.name}</h3>
                      <p>
                        {plan.slug} · {plan.isActive ? "Activo" : "Inactivo"} · {plan.durationDays} días
                      </p>
                    </div>
                    <AdminSubscriptionPlanForm plan={plan} />
                  </article>
                ))}
              </div>
            ) : (
              <p className="admin-users-empty">Todavía no hay planes. Crea el primero con el formulario superior.</p>
            )}
          </section>

          <section aria-labelledby="subscription-history-heading" className="admin-users-panel">
            <div className="admin-users-panel__heading">
              <div>
                <p className="eyebrow">Historial</p>
                <h2 id="subscription-history-heading">Suscripciones de prueba</h2>
              </div>
              <span className="admin-users-count">{subscriptions.length}</span>
            </div>
            {subscriptions.length ? (
              <div className="admin-subscription-list">
                {subscriptions.map((subscription) => (
                  <article className="admin-subscription-row" key={subscription.id}>
                    <div>
                      <h3>{subscription.displayName}</h3>
                      <p>
                        {subscription.planName} · {statusLabels[subscription.status]}
                      </p>
                      <PremiumHistoryList items={[subscription]} />
                    </div>
                    {subscription.status === "active" ? (
                      <AdminCancelSubscriptionForm subscriptionId={subscription.id} />
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <p className="admin-users-empty">Cuando un cliente simule un pago, el registro aparecerá aquí.</p>
            )}
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}