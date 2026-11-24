import Link from "next/link";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/navigation/site-header";
import {
  BreakdownBarChart,
  PaymentSimulationChart,
  PropertyCreationTrendChart,
  PropertyViewTrendChart,
  TopPropertyViewsChart,
} from "@/features/analytics/components/admin-dashboard-charts";
import { getAdminDashboardMetrics } from "@/features/analytics/repositories/admin-dashboard-repository";
import { resolveViewReportWindow, viewReportWindows } from "@/features/analytics/services/view-report-period";

export const metadata = { title: "Resumen administrativo" };

function metricLabel(value: number | null): string {
  return value === null ? "No disponible" : new Intl.NumberFormat("es-MX").format(value);
}

function formatPrice(value: number, currency: string): string {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(new Date(value));
}

type AdminDashboardPageProps = {
  searchParams: Promise<{ views?: string | string[] }>;
};

export default async function AdminDashboardPage({ searchParams }: AdminDashboardPageProps) {
  const params = await searchParams;
  const viewDays = resolveViewReportWindow(params.views);
  const metrics = await getAdminDashboardMetrics({ viewDays });
  const cards = [
    { label: "Propiedades registradas", value: metrics.propertiesTotal, href: "/admin/propiedades", detail: "Inventario persistido" },
    { label: "Publicaciones aprobadas", value: metrics.propertiesPublished, href: "/admin/propiedades", detail: "Inventario publicado" },
    { label: "Pendientes de revisión", value: metrics.propertiesPending, href: "/admin/propiedades", detail: "Requieren moderación" },
    { label: "Clientes activos", value: metrics.activeClients, href: "/admin/usuarios", detail: "Cuentas con estado activo" },
    { label: "Planes activos", value: metrics.activePlans, href: "/admin/suscripciones", detail: "Catálogo Premium" },
    { label: "Vigencias Premium", value: metrics.activePremiumPeriods, href: "/admin/suscripciones", detail: "Activas en este momento" },
  ];

  return (
    <div className="site-frame">
      <SiteHeader />
      <main className="site-main admin-users-main" id="main-content">
        <div className="admin-users-content">
          <header className="admin-users-heading">
            <p className="eyebrow">Administración · Resumen</p>
            <h1>Panel general</h1>
            <p>Actividad basada en registros de Paradise: inventario, moderación, suscripciones y cambios de precio.</p>
            <a className="button button--secondary button--small admin-dashboard-export" href={`/api/admin/analytics/export?views=${viewDays}`}>
              Descargar vistas CSV
            </a>
          </header>

          {metrics.unavailableSources.length ? (
            <p className="admin-dashboard-warning" role="status">
              Algunas cifras no están disponibles: {metrics.unavailableSources.join(", ")}. Revisa permisos y migraciones.
            </p>
          ) : null}

          <section aria-label="Indicadores clave" className="admin-dashboard-grid admin-dashboard-grid--summary">
            {cards.map((card) => (
              <Link className="admin-dashboard-card" href={card.href} key={card.label}>
                <span className="eyebrow">{card.label}</span>
                <strong>{metricLabel(card.value)}</strong>
                <small>{card.detail}</small>
              </Link>
            ))}
          </section>

          <form action="/admin" className="admin-dashboard-period-filter" method="get">
            <label htmlFor="admin-view-period">Periodo de vistas</label>
            <select defaultValue={String(viewDays)} id="admin-view-period" name="views">
              {viewReportWindows.map((days) => <option key={days} value={days}>{days} días</option>)}
            </select>
            <button className="button button--secondary button--small" type="submit">Aplicar</button>
          </form>

          <section aria-label="Gráficas de operación" className="admin-dashboard-charts">
            <PropertyCreationTrendChart points={metrics.propertyCreationTrend} />
            <PropertyViewTrendChart points={metrics.propertyViewTrend} windowDays={viewDays} />
            <TopPropertyViewsChart items={metrics.topPropertyViews} unavailable={metrics.unavailableSources.includes("Ranking de fichas vistas")} windowDays={viewDays} />
            <BreakdownBarChart
              emptyMessage="Todavía no hay vistas por tipo en este periodo."
              eyebrow={`Vistas · ${viewDays} días`}
              id="property-views-by-type-title"
              items={metrics.propertyViewTypeBreakdown}
              title="Vistas por tipo de inmueble"
            />
            <BreakdownBarChart
              emptyMessage="Todavía no hay vistas por ciudad en este periodo."
              eyebrow={`Vistas · ${viewDays} días`}
              id="property-views-by-city-title"
              items={metrics.propertyViewCityBreakdown}
              title="Vistas por ciudad"
              unavailable={metrics.unavailableSources.includes("Desglose de vistas")}
            />
            <BreakdownBarChart eyebrow="Moderación" id="publication-status-title" items={metrics.publicationStatuses} title="Estado de publicación" />
            <BreakdownBarChart eyebrow="Inventario" id="commercial-status-title" items={metrics.commercialStatuses} title="Estado comercial" />
            <PaymentSimulationChart weeks={metrics.paymentSimulationTrend} />
          </section>

          <section aria-labelledby="recent-price-changes-heading" className="admin-users-panel admin-dashboard-scope">
            <div className="admin-users-panel__heading">
              <div>
                <p className="eyebrow">Historial inmobiliario</p>
                <h2 id="recent-price-changes-heading">Cambios de precio recientes</h2>
              </div>
              <span className="admin-users-count">{metrics.recentPriceChanges.length}</span>
            </div>
            {metrics.unavailableSources.includes("Cambios de precio recientes") ? (
              <p className="admin-users-empty" role="status">No se pudo consultar el historial de precios.</p>
            ) : metrics.recentPriceChanges.length ? (
              <div className="admin-dashboard-table-wrap">
                <table className="admin-dashboard-table">
                  <thead>
                    <tr><th scope="col">Propiedad</th><th scope="col">Precio anterior</th><th scope="col">Precio nuevo</th><th scope="col">Fecha</th></tr>
                  </thead>
                  <tbody>
                    {metrics.recentPriceChanges.map((change) => (
                      <tr key={change.id}>
                        <th scope="row">
                          {change.propertySlug
                            ? <Link href={`/propiedad/${change.propertySlug}`}>{change.propertyTitle}</Link>
                            : change.propertyTitle}
                        </th>
                        <td>{formatPrice(change.previousPrice, change.currency)}</td>
                        <td>{formatPrice(change.newPrice, change.currency)}</td>
                        <td><time dateTime={change.changedAt}>{formatDate(change.changedAt)}</time></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="admin-users-empty">Todavía no hay cambios de precio registrados.</p>
            )}
          </section>

          <section aria-labelledby="dashboard-scope-heading" className="admin-users-panel admin-dashboard-scope">
            <p className="eyebrow">Alcance de estas cifras</p>
            <h2 id="dashboard-scope-heading">Fuentes y alcance</h2>
            <p>Las vistas cuentan una por ficha, por pestaña y día. Se usa un identificador aleatorio guardado solo en la sesión de la pestaña; no se guarda IP ni identidad, y los registros se eliminan después de 90 días. Las simulaciones Premium son pruebas, no ingresos.</p>
            <nav aria-label="Herramientas administrativas" className="admin-dashboard-links">
              <Link className="text-link" href="/admin/propiedades">Inventario ↗</Link>
              <Link className="text-link" href="/admin/usuarios">Usuarios ↗</Link>
              <Link className="text-link" href="/admin/suscripciones">Suscripciones ↗</Link>
            </nav>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
