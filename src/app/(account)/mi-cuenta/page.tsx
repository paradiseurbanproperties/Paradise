import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/navigation/site-header";
import { AuthForm } from "@/features/auth/components/auth-form";
import { updateProfileAction } from "@/features/users/actions/profile-actions";
import { requireActiveProfile } from "@/lib/permissions/access";
import { getLatestSubscription, hasActivePremiumSubscription } from "@/features/subscriptions/repositories/subscription-repository";
import { PremiumAvatar } from "@/components/ui/premium-avatar";
import Link from "next/link";

export const metadata = { title: "Mi cuenta" };

const roleLabels = {
  client: "Cliente",
  agent: "Agente",
  admin: "Administrador",
} as const;

export default async function AccountPage() {
  const access = await requireActiveProfile();
  const [subscription, isPremium] = access.role === "client"
    ? await Promise.all([
        getLatestSubscription(access.userId),
        hasActivePremiumSubscription(access.userId),
      ])
    : [null, false];

  return (
    <div className="site-frame">
      <SiteHeader />
      <main className="site-main account-main" id="main-content">
        <section aria-labelledby="account-title" className="account-card">
          <p className="eyebrow">Tu espacio Paradise</p>
          <h1 id="account-title">Mi cuenta</h1>
          <p className="account-card__intro">
            Perfil activo · <strong>{roleLabels[access.role]}</strong>
          </p>
          {access.role === "client" ? (
            <section className="account-premium-panel" aria-label="Estado de membresía Premium">
              <PremiumAvatar label={isPremium ? "Perfil Premium activo" : "Perfil de cliente"} premium={isPremium} size="large">
                {(access.displayName.trim()[0] || "C").toUpperCase()}
              </PremiumAvatar>
              <div>
                <p className="eyebrow">Membresía</p>
                <h2>{isPremium ? "Paradise Premium activo" : "Cliente Paradise"}</h2>
                <p>{isPremium && subscription?.expiresAt
                  ? `Tu acceso está vigente hasta ${new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(new Date(subscription.expiresAt))}.`
                  : "Explora propiedades exclusivas y beneficios para clientes."}</p>
                <Link className="text-link" href="/premium">{isPremium ? "Ver plan, historial o cancelar" : "Conocer Premium"} ↗</Link>
              </div>
            </section>
          ) : null}
          <AuthForm action={updateProfileAction} submitLabel="Guardar cambios">
            <label className="auth-field">
              <span>Nombre visible</span>
              <input
                autoComplete="name"
                defaultValue={access.displayName}
                maxLength={120}
                minLength={2}
                name="displayName"
                required
              />
            </label>
          </AuthForm>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
