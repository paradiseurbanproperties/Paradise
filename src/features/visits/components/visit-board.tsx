import Link from "next/link";
import { VisitManagementForm } from "@/features/visits/components/visit-controls";
import type { VisitRecord } from "@/features/visits/types/visit";
import { VISIT_STATUS_LABELS } from "@/features/visits/types/visit";

export function VisitBoard({ visits, unavailable }: { visits: VisitRecord[]; unavailable: boolean }) {
  if (unavailable) return <section className="visit-empty" role="alert"><h2>Agenda no disponible</h2><p>Revisa que la migración de visitas esté aplicada y que Supabase responda.</p></section>;
  if (!visits.length) return <section className="visit-empty"><h2>No hay visitas programadas</h2><p>Las solicitudes nuevas aparecerán aquí para su confirmación.</p></section>;
  return (
    <ol className="visit-list">
      {visits.map((visit) => (
        <li className="visit-card" key={visit.id}>
          <div className="visit-card__heading">
            <div>
              <p className="eyebrow">{visit.city || "Agenda Paradise"}</p>
              <h2>{visit.propertySlug ? <Link href={`/propiedad/${visit.propertySlug}`}>{visit.propertyTitle}</Link> : visit.propertyTitle}</h2>
            </div>
            <span className={`visit-status visit-status--${visit.status}`}>{VISIT_STATUS_LABELS[visit.status]}</span>
          </div>
          <dl className="visit-card__details">
            <div><dt>Fecha y hora</dt><dd><time dateTime={visit.startsAt}>{formatVisitDate(visit.startsAt)}</time></dd></div>
            <div><dt>Solicitante</dt><dd>{visit.clientName} · <a href={`mailto:${visit.clientEmail}`}>{visit.clientEmail}</a></dd></div>
          </dl>
          {visit.message ? <p className="visit-card__message">{visit.message}</p> : null}
          {visit.history.length > 1 ? <details className="visit-card__history"><summary>Ver historial ({visit.history.length} cambios)</summary><ol>{visit.history.map((item, index) => <li key={`${item.changedAt}-${index}`}>{VISIT_STATUS_LABELS[item.newStatus]} · {formatVisitDate(item.newStartsAt)}</li>)}</ol></details> : null}
          <VisitManagementForm status={visit.status} visitId={visit.id} />
        </li>
      ))}
    </ol>
  );
}

export function formatVisitDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Mexico_City" }).format(new Date(value));
}
