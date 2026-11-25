import Link from "next/link";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/navigation/site-header";
import { CancelOwnVisitButton } from "@/features/visits/components/visit-controls";
import { formatVisitDate } from "@/features/visits/components/visit-board";
import { listVisits } from "@/features/visits/repositories/visit-repository";
import { VISIT_STATUS_LABELS } from "@/features/visits/types/visit";
import { requireProfileRole } from "@/lib/permissions/access";

export const metadata = { title: "Mis visitas" };

export default async function MyVisitsPage() {
  await requireProfileRole(["client"]);
  const { visits, unavailable } = await listVisits("own");
  return (
    <div className="site-frame">
      <SiteHeader />
      <main className="site-main visits-main" id="main-content">
        <div className="visits-content">
          <header className="visits-heading"><p className="eyebrow">Tu espacio Paradise</p><h1>Mis visitas</h1><p>Consulta solicitudes, horarios confirmados y cambios de cada visita.</p></header>
          {unavailable ? <section className="visit-empty" role="alert"><h2>No se pudo cargar tu agenda</h2><p>Revisa que la conexión con Supabase esté disponible.</p></section> : visits.length ? (
            <ol className="visit-list">{visits.map((visit) => <li className="visit-card" key={visit.id}>
              <div className="visit-card__heading"><div><p className="eyebrow">{visit.city}</p><h2>{visit.propertySlug ? <Link href={`/propiedad/${visit.propertySlug}`}>{visit.propertyTitle}</Link> : visit.propertyTitle}</h2></div><span className={`visit-status visit-status--${visit.status}`}>{VISIT_STATUS_LABELS[visit.status]}</span></div>
              <dl className="visit-card__details"><div><dt>Fecha y hora</dt><dd><time dateTime={visit.startsAt}>{formatVisitDate(visit.startsAt)}</time></dd></div><div><dt>Duración</dt><dd>1 hora</dd></div></dl>
              {visit.message ? <p className="visit-card__message">{visit.message}</p> : null}
              {visit.history.length ? <details className="visit-card__history"><summary>Historial de cambios</summary><ol>{visit.history.map((item, index) => <li key={`${item.changedAt}-${index}`}>{VISIT_STATUS_LABELS[item.newStatus]} · {formatVisitDate(item.newStartsAt)}</li>)}</ol></details> : null}
              {(["requested", "confirmed"] as const).includes(visit.status as "requested" | "confirmed") ? <CancelOwnVisitButton visitId={visit.id} /> : null}
            </li>)}</ol>
          ) : <section className="visit-empty"><h2>Aún no tienes visitas</h2><p>Solicita un horario desde la ficha de una propiedad disponible.</p><Link className="button button--secondary button--medium" href="/propiedades">Explorar propiedades</Link></section>}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
