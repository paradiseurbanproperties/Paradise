import Link from "next/link";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/navigation/site-header";
import { listAssignedAgentProperties } from "@/features/agents/repositories/agent-repository";
import { requireProfileRole } from "@/lib/permissions/access";

export const metadata = { title: "Mi cartera de propiedades" };

const publicationLabels = {
  draft: "Borrador",
  pending: "En revisión",
  approved: "Publicada",
  rejected: "Rechazada",
  archived: "Archivada",
} as const;

const statusLabels = {
  available: "Disponible",
  in_deal: "En negociación",
  sold: "Vendida",
} as const;

export default async function AgentDashboardPage() {
  const access = await requireProfileRole(["agent"]);
  const { properties, unavailable } = await listAssignedAgentProperties(access.userId);
  const publishedCount = properties.filter((property) => property.publicationStatus === "approved").length;
  const negotiationCount = properties.filter((property) => property.status === "in_deal").length;

  return (
    <div className="site-frame">
      <SiteHeader />
      <main className="site-main agent-dashboard-main" id="main-content">
        <div className="agent-dashboard-content">
          <header className="agent-dashboard-heading">
            <p className="eyebrow">Espacio profesional</p>
            <h1>Hola, {access.displayName}</h1>
            <p>Consulta tu cartera y el estado de las propiedades que te asignó la administración.</p>
          </header>
          {unavailable ? (
            <section className="agent-dashboard-notice" role="alert">
              <h2>No se pudo cargar tu cartera</h2>
              <p>Revisa la conexión con Supabase y los permisos de asignación.</p>
            </section>
          ) : (
            <>
              <section aria-label="Resumen de cartera" className="agent-dashboard-stats">
                <article><span>Propiedades asignadas</span><strong>{properties.length}</strong></article>
                <article><span>Publicadas</span><strong>{publishedCount}</strong></article>
                <article><span>En negociación</span><strong>{negotiationCount}</strong></article>
              </section>
              {properties.length ? (
                <section aria-labelledby="agent-properties-heading" className="agent-dashboard-list-section">
                  <div className="agent-dashboard-list-heading">
                    <div><p className="eyebrow">Tu inventario</p><h2 id="agent-properties-heading">Propiedades asignadas</h2></div>
                    <span>{properties.length} {properties.length === 1 ? "propiedad" : "propiedades"}</span>
                  </div>
                  <div className="agent-dashboard-list">
                    {properties.map((property) => {
                      const publicDetail = property.publicationStatus === "approved" && ["public", "both"].includes(property.visibility);
                      return (
                        <article className="agent-property-card" key={property.assignmentId}>
                          <div className="agent-property-card__main">
                            <div className="agent-property-card__title-row">
                              <div><p className="eyebrow">{property.city}, {property.state}</p><h3>{property.title}</h3></div>
                              <strong>{new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(property.price)}</strong>
                            </div>
                            <div className="agent-property-card__meta">
                              <span className={`agent-property-badge agent-property-badge--${property.publicationStatus}`}>{publicationLabels[property.publicationStatus]}</span>
                              <span>{statusLabels[property.status]}</span>
                              <span>Asignada el {new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(new Date(property.assignedAt))}</span>
                            </div>
                          </div>
                          {publicDetail ? <Link className="text-link" href={`/propiedades/${property.slug}`}>Ver ficha pública →</Link> : <span className="agent-property-card__private-note">Visible solo para el equipo asignado mientras no sea pública</span>}
                        </article>
                      );
                    })}
                  </div>
                </section>
              ) : (
                <section className="agent-dashboard-notice">
                  <span aria-hidden="true">⌂</span>
                  <h2>Tu cartera aún está vacía</h2>
                  <p>Cuando administración te asigne propiedades, aparecerán aquí con su estado actual.</p>
                  <Link className="text-link" href="/agentes">Ver el directorio público →</Link>
                </section>
              )}
            </>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
