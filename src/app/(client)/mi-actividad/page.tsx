import Link from "next/link";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/navigation/site-header";
import { listOwnCustomerActivity } from "@/features/activity/repositories/customer-activity-repository";
import { listPublicProperties } from "@/features/properties/repositories/property-repository";
import { requireProfileRole } from "@/lib/permissions/access";

export const metadata = { title: "Mi actividad" };

const activityLabels = {
  property_viewed: "Consultaste esta propiedad",
  favorite_added: "Guardaste esta propiedad en favoritos",
  favorite_removed: "Quitaste esta propiedad de favoritos",
  inquiry_sent: "Enviaste una consulta sobre esta propiedad",
};

export default async function CustomerActivityPage() {
  await requireProfileRole(["client"]);
  const [{ entries, unavailable }, properties] = await Promise.all([
    listOwnCustomerActivity(),
    listPublicProperties(),
  ]);
  const publicProperties = new Map(properties.filter((property) => !property.demo).map((property) => [property.id, property]));

  return (
    <div className="site-frame">
      <SiteHeader />
      <main className="site-main customer-activity-main" id="main-content">
        <div className="customer-activity-content">
          <header className="customer-activity-heading">
            <p className="eyebrow">Tu espacio Paradise</p>
            <h1>Mi actividad</h1>
            <p>Un registro privado de propiedades que has consultado, guardado o sobre las que enviaste una consulta.</p>
          </header>
          {unavailable ? (
            <section className="customer-activity-empty" role="alert"><h2>No se pudo cargar tu actividad</h2><p>Comprueba que la migración 0016 esté aplicada.</p></section>
          ) : entries.length ? (
            <ol className="customer-activity-list">
              {entries.map((entry) => {
                const property = entry.propertyId ? publicProperties.get(entry.propertyId) : undefined;
                return (
                  <li className="customer-activity-item" key={entry.id}>
                    <span aria-hidden="true" className={`customer-activity-item__marker customer-activity-item__marker--${entry.activityType}`} />
                    <div className="customer-activity-item__body">
                      <p>{activityLabels[entry.activityType]}{property ? <>: <Link href={`/propiedad/${property.slug}`}>{property.title}</Link></> : <span> (ya no disponible)</span>}</p>
                      <time dateTime={entry.createdAt}>{new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(new Date(entry.createdAt))}</time>
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <section className="customer-activity-empty"><span aria-hidden="true">◷</span><h2>Aún no hay actividad</h2><p>Cuando consultes o guardes una propiedad, aparecerá aquí.</p><Link className="button button--secondary button--medium" href="/propiedades">Explorar propiedades</Link></section>
          )}
          <p className="customer-activity-privacy">Este historial es privado y se limita a tus últimas 500 actividades.</p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
