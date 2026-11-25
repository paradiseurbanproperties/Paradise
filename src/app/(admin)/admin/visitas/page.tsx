import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/navigation/site-header";
import { VisitBoard } from "@/features/visits/components/visit-board";
import { listVisits } from "@/features/visits/repositories/visit-repository";
import { requireProfileRole } from "@/lib/permissions/access";

export const metadata = { title: "Administrar visitas" };

export default async function AdminVisitsPage() {
  await requireProfileRole(["admin"]);
  const { visits, unavailable } = await listVisits("team");
  const pendingCount = visits.filter((visit) => visit.status === "requested").length;
  return <div className="site-frame"><SiteHeader /><main className="site-main visits-main" id="main-content"><div className="visits-content">
    <header className="visits-heading"><p className="eyebrow">Administración · Agenda</p><h1>Solicitudes de visita</h1><p>Revisa la agenda completa, confirma horarios, reprograma o registra el resultado de cada visita.</p>{!unavailable ? <p className="visit-summary-count">{pendingCount} solicitudes pendientes · {visits.length} visitas en agenda</p> : null}</header>
    <VisitBoard unavailable={unavailable} visits={visits} />
  </div></main><SiteFooter /></div>;
}
