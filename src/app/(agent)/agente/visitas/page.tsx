import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/navigation/site-header";
import { VisitBoard } from "@/features/visits/components/visit-board";
import { listVisits } from "@/features/visits/repositories/visit-repository";
import { requireProfileRole } from "@/lib/permissions/access";

export const metadata = { title: "Agenda de visitas" };

export default async function AgentVisitsPage() {
  await requireProfileRole(["agent"]);
  const { visits, unavailable } = await listVisits("team");
  return <div className="site-frame"><SiteHeader /><main className="site-main visits-main" id="main-content"><div className="visits-content">
    <header className="visits-heading"><p className="eyebrow">Espacio profesional · Agenda</p><h1>Visitas asignadas</h1><p>Confirma o rechaza horarios, reprograma citas y actualiza las visitas realizadas. Solo ves solicitudes de propiedades a tu cargo.</p></header>
    <VisitBoard unavailable={unavailable} visits={visits} />
  </div></main><SiteFooter /></div>;
}
