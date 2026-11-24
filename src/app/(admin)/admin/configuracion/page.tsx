import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/navigation/site-header";
import { SiteSettingsForm } from "@/features/site-settings/components/site-settings-form";
import { getAdminSiteSettings } from "@/features/site-settings/repositories/site-settings-repository";
import { requireProfileRole } from "@/lib/permissions/access";

export const metadata = { title: "Configuración del sitio", robots: { index: false, follow: false } };

export default async function AdminSiteSettingsPage() {
  await requireProfileRole(["admin"]);
  const settings = await getAdminSiteSettings();
  return (
    <div className="site-frame">
      <SiteHeader />
      <main className="site-main admin-users-main" id="main-content">
        <div className="admin-users-content">
          <header className="admin-users-heading">
            <p className="eyebrow">Administración · Sitio</p>
            <h1>Configuración general</h1>
            <p>Actualiza la identidad pública y el contacto que la inmobiliaria decida publicar.</p>
          </header>
          <SiteSettingsForm settings={settings} />
          <p className="admin-users-empty">El correo y teléfono quedan vacíos hasta que agregues datos confirmados. No se publica una dirección comercial.</p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
