import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/navigation/site-header";
import { LeadBoard } from "@/features/crm/components/lead-board";
import { listCrmLeads } from "@/features/crm/repositories/lead-repository";
import { requireProfileRole } from "@/lib/permissions/access";

export const metadata = { title: "Mis leads" };

export default async function AgentLeadsPage() {
  await requireProfileRole(["agent"]);
  const { leads, unavailable } = await listCrmLeads();
  return (
    <div className="site-frame">
      <SiteHeader />
      <main className="site-main crm-main" id="main-content">
        <div className="crm-content">
          <header className="crm-heading">
            <p className="eyebrow">Espacio profesional · CRM</p>
            <h1>Mis leads</h1>
            <p>Da seguimiento a las consultas de tus propiedades. El tablero solo muestra leads que te fueron asignados.</p>
          </header>
          {unavailable ? (
            <section className="crm-empty-state" role="alert"><h2>CRM no disponible</h2><p>Revisa la migración de leads y los permisos de Supabase.</p></section>
          ) : leads.length ? (
            <><p className="crm-result-count">{leads.length} {leads.length === 1 ? "lead" : "leads"} recientes · máximo 100</p><LeadBoard leads={leads} /></>
          ) : (
            <section className="crm-empty-state"><span aria-hidden="true">✉</span><h2>Tu tablero está vacío</h2><p>Cuando llegue una consulta de tus propiedades, aparecerá aquí.</p></section>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
