import type { Metadata } from "next";
import Link from "next/link";
import * as motion from "motion/react-client";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/navigation/site-header";
import { PremiumCancelForm } from "@/features/subscriptions/components/premium-cancel-form";
import { PremiumHistoryList } from "@/features/subscriptions/components/premium-history-list";
import { PremiumPlanCard } from "@/features/subscriptions/components/premium-plan-card";
import {
  getLatestSubscription,
  hasActivePremiumSubscription,
  listActiveSubscriptionPlans,
  listOwnSubscriptionHistory,
} from "@/features/subscriptions/repositories/subscription-repository";
import { getCurrentAccessContext } from "@/lib/permissions/access";

export const metadata: Metadata = {
  title: "Paradise Premium",
  description: "Acceso simulado a propiedades y beneficios Premium de Paradise.",
  alternates: { canonical: "/premium" },
};

function dateLabel(value: string | null): string {
  if (!value) return "Pendiente";
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(new Date(value));
}

export default async function PremiumPage() {
  const [access, planResult] = await Promise.all([
    getCurrentAccessContext(),
    listActiveSubscriptionPlans(),
  ]);
  const isClient = access?.role === "client" && access.status === "active";
  const [subscription, isPremium, history] = isClient
    ? await Promise.all([
        getLatestSubscription(access.userId),
        hasActivePremiumSubscription(access.userId),
        listOwnSubscriptionHistory(access.userId),
      ])
    : [null, false, []];
  const statusLabels = { active: "Activa", pending: "Pendiente", expired: "Vencida", cancelled: "Cancelada" } as const;
  const subscriptionStatus = subscription ? statusLabels[subscription.status] : null;

  return (
    <div className="site-frame">
      <SiteHeader />
      <main className="site-main premium-main" id="main-content">
        <div className="premium-page">
          <motion.header
            animate={{ opacity: 1, y: 0 }}
            className="premium-heading"
            initial={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="eyebrow">Un espacio más exclusivo</p>
            <h1 className="page-title">Paradise <em>Premium.</em></h1>
            <p>Accede a publicaciones exclusivas y destaca tu perfil. Esta experiencia usa exclusivamente pagos de prueba.</p>
          </motion.header>

          {!access ? (
            <section className="premium-status-panel">
              <h2>Inicia sesión para continuar</h2>
              <p>Premium se asocia a una cuenta Cliente y no cambia el rol de tu perfil.</p>
              <Link className="button button--primary button--medium" href="/login?next=%2Fpremium">Iniciar sesión</Link>
            </section>
          ) : null}

          {access && !isClient ? (
            <section className="premium-status-panel">
              <h2>Plan disponible para cuentas Cliente</h2>
              <p>El acceso Premium es una suscripción de Cliente; no modifica los roles Agente ni Administrador.</p>
            </section>
          ) : null}

          {isClient ? (
            <>
            <motion.section aria-label="Estado de suscripción" className={`premium-status-panel${isPremium ? " premium-status-panel--active" : ""}`} initial={{ opacity: 0, y: 20 }} transition={{ duration: 0.55 }} viewport={{ once: true }} whileInView={{ opacity: 1, y: 0 }}>
                <div>
                  <p className="eyebrow">Tu suscripción</p>
                  <h2>{isPremium ? "Premium está activo" : "Explora los planes"}</h2>
                  <p>{isPremium && subscription?.expiresAt
                    ? `Vigente hasta ${dateLabel(subscription.expiresAt)}.`
                    : subscriptionStatus
                      ? `Estado de tu último intento: ${subscriptionStatus.toLocaleLowerCase("es-MX").replace(/^./, (letter) => letter.toUpperCase())}.`
                      : "Todavía no tienes una suscripción activa."}</p>
                </div>
                {isPremium ? (
                  <div className="premium-status-panel__actions">
                    <span aria-label="Membresía Premium activa" className="premium-status-panel__badge">✦ Premium</span>
                    <PremiumCancelForm />
                  </div>
                ) : null}
            </motion.section>

              {planResult.status !== "ready" ? (
                <motion.section className="premium-status-panel" initial={{ opacity: 0, y: 20 }} role="status" transition={{ duration: 0.55 }} viewport={{ once: true }} whileInView={{ opacity: 1, y: 0 }}>
                  <h2>{planResult.status === "not_configured" ? "Supabase no está configurado" : "Planes no disponibles todavía"}</h2>
                  <p>{planResult.status === "not_configured"
                    ? "Configura el proyecto Supabase para consultar planes reales."
                    : "No se pudieron leer los planes. Confirma que la migración 0006 está aplicada y que hay un plan activo."}</p>
                </motion.section>
              ) : planResult.plans.length ? (
                <motion.section aria-label="Planes Premium" className="premium-plans-grid" initial={{ opacity: 0, y: 24 }} transition={{ duration: 0.65 }} viewport={{ amount: 0.1, once: true }} whileInView={{ opacity: 1, y: 0 }}>
                  {planResult.plans.map((plan, index) => (
                    <motion.div initial={{ opacity: 0, scale: 0.97, y: 16 }} key={plan.id} transition={{ delay: index * 0.08, duration: 0.5 }} viewport={{ once: true }} whileHover={{ y: -5, transition: { type: "spring", stiffness: 280, damping: 22 } }} whileInView={{ opacity: 1, scale: 1, y: 0 }}>
                      <PremiumPlanCard plan={plan} />
                    </motion.div>
                  ))}
                </motion.section>
              ) : (
                <motion.section className="premium-status-panel" initial={{ opacity: 0, y: 20 }} transition={{ duration: 0.55 }} viewport={{ once: true }} whileInView={{ opacity: 1, y: 0 }}>
                  <h2>No hay planes activos</h2>
                  <p>Un administrador debe habilitar un plan para ofrecer suscripciones.</p>
                </motion.section>
              )}

              <motion.section aria-labelledby="premium-history-heading" className="premium-status-panel premium-status-panel--stack" initial={{ opacity: 0, y: 20 }} transition={{ duration: 0.55 }} viewport={{ once: true }} whileInView={{ opacity: 1, y: 0 }}>
                <div>
                  <p className="eyebrow">Historial de prueba</p>
                  <h2 id="premium-history-heading">Pagos y vigencias simulados</h2>
                  <p>Estos registros no representan ingresos reales. El acceso depende solo de una suscripción activa y vigente.</p>
                  <PremiumHistoryList items={history} />
                </div>
              </motion.section>
            </>
          ) : null}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
