import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/navigation/site-header";
import { LeadBoard } from "@/features/crm/components/lead-board";
import { listCrmLeads } from "@/features/crm/repositories/lead-repository";
import { requireProfileRole } from "@/lib/permissions/access";

export const metadata = { title: "CRM de leads" };

export default async function AdminLeadsPage() {
  await requireProfileRole(["admin"]);
  const { leads, unavailable } = await listCrmLeads();
  return (
    <div className="site-frame">
      <SiteHeader />
      <main className="site-main crm-main" id="main-content">
        <div className="crm-content">
          <header className="crm-heading">
            <p className="eyebrow">Administración · CRM</p>
            <h1>Leads de Paradise</h1>
            <p>Consultas recibidas desde fichas públicas. Las notas y los datos de contacto son privados para el equipo autorizado.</p>
          </header>
          {unavailable ? (
            <section className="crm-empty-state" role="alert"><h2>CRM no disponible</h2><p>Aplica la migración de leads y revisa los permisos de Supabase.</p></section>
          ) : leads.length ? (
            <><p className="crm-result-count">{leads.length} {leads.length === 1 ? "lead" : "leads"} recientes · máximo 100</p><LeadBoard leads={leads} /></>
          ) : (
            <section className="crm-empty-state"><span aria-hidden="true">✉</span><h2>Aún no hay consultas</h2><p>Los mensajes de las fichas públicas aparecerán aquí al enviarse.</p></section>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
