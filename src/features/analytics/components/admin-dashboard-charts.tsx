import type {
  DashboardBreakdown,
  PaymentSimulationWeek,
  PropertyCreationPoint,
  PropertyViewPoint,
  TopPropertyView,
} from "@/features/analytics/repositories/admin-dashboard-repository";
import Link from "next/link";

function formatCount(value: number | null): string {
  return value === null ? "—" : new Intl.NumberFormat("es-MX").format(value);
}

export function BreakdownBarChart({
  emptyMessage = "Aún no hay propiedades registradas.",
  eyebrow,
  id,
  items,
  unavailable: unavailableOverride = false,
  title,
}: {
  emptyMessage?: string;
  eyebrow: string;
  id: string;
  items: DashboardBreakdown[];
  unavailable?: boolean;
  title: string;
}) {
  const availableValues = items.flatMap((item) => item.value === null ? [] : [item.value]);
  const maximum = Math.max(1, ...availableValues);
  const allZero = availableValues.length > 0 && availableValues.every((value) => value === 0);
  const unavailable = unavailableOverride || items.some((item) => item.value === null);

  return (
    <figure className="analytics-chart" aria-labelledby={id}>
      <figcaption className="analytics-chart__heading">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2 id={id}>{title}</h2>
        </div>
        <span className="admin-users-count">{formatCount(availableValues.reduce((sum, value) => sum + value, 0))}</span>
      </figcaption>
      {unavailable || !availableValues.length ? (
        <p className="analytics-chart__empty">No se pudo consultar esta distribución.</p>
      ) : allZero || !items.length ? (
        <p className="analytics-chart__empty">{emptyMessage}</p>
      ) : (
        <ol className="analytics-horizontal-bars">
          {items.map((item, index) => (
            <li className="analytics-horizontal-bars__item" key={item.label}>
              <div className="analytics-horizontal-bars__label">
                <span>{item.label}</span>
                <strong>{formatCount(item.value)}</strong>
              </div>
              <div className="analytics-horizontal-bars__track" aria-hidden="true">
                <span
                  className={`analytics-horizontal-bars__fill analytics-horizontal-bars__fill--${index}`}
                  style={{ width: item.value === null ? "0%" : `${(item.value / maximum) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ol>
      )}
    </figure>
  );
}

export function PropertyCreationTrendChart({ points }: { points: PropertyCreationPoint[] }) {
  const available = points.filter((point): point is PropertyCreationPoint & { value: number } => point.value !== null);
  const unavailable = available.length !== points.length;
  const maximum = Math.max(1, ...available.map((point) => point.value));
  const width = 720;
  const height = 260;
  const left = 42;
  const right = 690;
  const top = 22;
  const bottom = 198;
  const xFor = (index: number) => left + (points.length <= 1 ? 0 : (index / (points.length - 1)) * (right - left));
  const yFor = (value: number | null) => bottom - ((value ?? 0) / maximum) * (bottom - top);
  const coordinates = points.map((point, index) => `${xFor(index)},${yFor(point.value)}`).join(" ");
  const total = available.reduce((sum, point) => sum + point.value, 0);

  return (
    <figure className="analytics-chart analytics-chart--trend" aria-labelledby="property-trend-title">
      <figcaption className="analytics-chart__heading">
        <div>
          <p className="eyebrow">Tendencia · 6 meses</p>
          <h2 id="property-trend-title">Nuevas propiedades registradas</h2>
        </div>
        <span className="admin-users-count">{formatCount(total)}</span>
      </figcaption>
      {unavailable || available.length === 0 ? (
        <p className="analytics-chart__empty">No se pudo consultar la serie.</p>
      ) : total === 0 ? (
        <p className="analytics-chart__empty">No se registraron propiedades en los últimos seis meses.</p>
      ) : (
        <>
          <svg
            aria-label={`Propiedades creadas por mes: ${points.map((point) => `${point.label}: ${formatCount(point.value)}`).join(", ")}`}
            className="analytics-line-chart"
            role="img"
            viewBox={`0 0 ${width} ${height}`}
          >
            {[0, Math.ceil(maximum / 2), maximum].filter((value, index, array) => array.indexOf(value) === index).map((tick) => {
              const y = yFor(tick);
              return (
                <g key={tick}>
                  <line className="analytics-line-chart__grid" x1={left} x2={right} y1={y} y2={y} />
                  <text className="analytics-line-chart__axis-label" textAnchor="end" x={left - 10} y={y + 4}>{tick}</text>
                </g>
              );
            })}
            <line className="analytics-line-chart__axis" x1={left} x2={right} y1={bottom} y2={bottom} />
            <polyline className="analytics-line-chart__line" points={coordinates} />
            {points.map((point, index) => (
              <g key={point.period}>
                <circle className="analytics-line-chart__point" cx={xFor(index)} cy={yFor(point.value)} r="5" />
                <text className="analytics-line-chart__value" textAnchor="middle" x={xFor(index)} y={yFor(point.value) - 12}>
                  {formatCount(point.value)}
                </text>
                <text className="analytics-line-chart__month" textAnchor="middle" x={xFor(index)} y={bottom + 25}>
                  {point.label}
                </text>
              </g>
            ))}
          </svg>
          <p className="analytics-chart__caption">Conteo por fecha de creación, no por vistas de publicación.</p>
        </>
      )}
    </figure>
  );
}

export function PropertyViewTrendChart({ points, windowDays }: { points: PropertyViewPoint[]; windowDays: number }) {
  const available = points.filter((point): point is PropertyViewPoint & { value: number } => point.value !== null);
  const unavailable = available.length !== points.length;
  const maximum = Math.max(1, ...available.map((point) => point.value));
  const width = 720;
  const height = 260;
  const left = 42;
  const right = 690;
  const top = 22;
  const bottom = 198;
  const xFor = (index: number) => left + (points.length <= 1 ? 0 : (index / (points.length - 1)) * (right - left));
  const yFor = (value: number | null) => bottom - ((value ?? 0) / maximum) * (bottom - top);
  const coordinates = points.map((point, index) => `${xFor(index)},${yFor(point.value)}`).join(" ");
  const total = available.reduce((sum, point) => sum + point.value, 0);
  const tickIndexes = [...new Set([0, 0.25, 0.5, 0.75, 1].map((ratio) => Math.round((points.length - 1) * ratio)))];

  return (
    <figure className="analytics-chart analytics-chart--trend" aria-labelledby="property-views-title">
      <figcaption className="analytics-chart__heading">
        <div>
          <p className="eyebrow">Tráfico · últimos {windowDays} días</p>
          <h2 id="property-views-title">Vistas de fichas</h2>
        </div>
        <span className="admin-users-count">{formatCount(total)}</span>
      </figcaption>
      {unavailable || available.length === 0 ? (
        <p className="analytics-chart__empty">No se pudo consultar la serie. Revisa si la migración 0008 está aplicada.</p>
      ) : total === 0 ? (
        <p className="analytics-chart__empty">Aún no hay vistas registradas para el periodo.</p>
      ) : (
        <svg
          aria-label={`Vistas por día: ${points.map((point) => `${point.label}: ${formatCount(point.value)}`).join(", ")}`}
          className="analytics-line-chart"
          role="img"
          viewBox={`0 0 ${width} ${height}`}
        >
          {[0, Math.ceil(maximum / 2), maximum].filter((value, index, array) => array.indexOf(value) === index).map((tick) => {
            const y = yFor(tick);
            return (
              <g key={tick}>
                <line className="analytics-line-chart__grid" x1={left} x2={right} y1={y} y2={y} />
                <text className="analytics-line-chart__axis-label" textAnchor="end" x={left - 10} y={y + 4}>{tick}</text>
              </g>
            );
          })}
          <line className="analytics-line-chart__axis" x1={left} x2={right} y1={bottom} y2={bottom} />
          <polyline className="analytics-line-chart__line analytics-line-chart__line--views" points={coordinates} />
          {points.map((point, index) => (
            <g key={point.period}>
              <circle className="analytics-line-chart__point analytics-line-chart__point--views" cx={xFor(index)} cy={yFor(point.value)} r="3" />
              {tickIndexes.includes(index) ? (
                <text className="analytics-line-chart__month" textAnchor="middle" x={xFor(index)} y={bottom + 25}>{point.label}</text>
              ) : null}
            </g>
          ))}
        </svg>
      )}
      <p className="analytics-chart__caption">Una vista por ficha, por pestaña y día. Los datos de demostración no se cuentan.</p>
    </figure>
  );
}

export function TopPropertyViewsChart({ items, unavailable, windowDays }: { items: TopPropertyView[]; unavailable: boolean; windowDays: number }) {
  const maximum = Math.max(1, ...items.map((item) => item.views));
  const total = items.reduce((sum, item) => sum + item.views, 0);

  return (
    <figure className="analytics-chart analytics-chart--ranking" aria-labelledby="top-property-views-title">
      <figcaption className="analytics-chart__heading">
        <div>
          <p className="eyebrow">Últimos {windowDays} días</p>
          <h2 id="top-property-views-title">Fichas más vistas</h2>
        </div>
        <span className="admin-users-count">{formatCount(total)}</span>
      </figcaption>
      {unavailable ? (
        <p className="analytics-chart__empty">No se pudo consultar el ranking. Revisa la migración 0009.</p>
      ) : items.length === 0 ? (
        <p className="analytics-chart__empty">Aún no hay vistas de fichas en el periodo.</p>
      ) : (
        <ol className="analytics-horizontal-bars analytics-horizontal-bars--ranking">
          {items.map((item, index) => (
            <li className="analytics-horizontal-bars__item" key={item.id}>
              <div className="analytics-horizontal-bars__label">
                <span className="analytics-ranking-name">
                  <i aria-hidden="true">{index + 1}</i>
                  {item.slug ? <Link href={`/propiedad/${item.slug}`}>{item.title}</Link> : item.title}
                </span>
                <strong>{formatCount(item.views)}</strong>
              </div>
              <div className="analytics-horizontal-bars__track" aria-hidden="true">
                <span
                  className={`analytics-horizontal-bars__fill analytics-horizontal-bars__fill--${index % 5}`}
                  style={{ width: `${(item.views / maximum) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ol>
      )}
      <p className="analytics-chart__caption">Conteo deduplicado por propiedad, pestaña y día.</p>
    </figure>
  );
}

export function PaymentSimulationChart({ weeks }: { weeks: PaymentSimulationWeek[] }) {
  const values = weeks.flatMap((week) => [week.succeeded, week.declined].filter((value): value is number => value !== null));
  const maximum = Math.max(1, ...weeks.map((week) => (week.succeeded ?? 0) + (week.declined ?? 0)));
  const unavailable = weeks.some((week) => week.succeeded === null || week.declined === null);
  const totalSucceeded = weeks.reduce((sum, week) => sum + (week.succeeded ?? 0), 0);
  const totalDeclined = weeks.reduce((sum, week) => sum + (week.declined ?? 0), 0);

  return (
    <figure className="analytics-chart" aria-labelledby="payment-simulation-title">
      <figcaption className="analytics-chart__heading">
        <div>
          <p className="eyebrow">Últimos 28 días</p>
          <h2 id="payment-simulation-title">Simulaciones Premium</h2>
        </div>
        <span className="admin-users-count">{formatCount(totalSucceeded + totalDeclined)}</span>
      </figcaption>
      <div aria-label={`Aprobadas ${totalSucceeded}; rechazadas ${totalDeclined}`} className="analytics-chart__legend">
        <span><i className="analytics-chart__legend-dot analytics-chart__legend-dot--success" />Aprobadas · {formatCount(totalSucceeded)}</span>
        <span><i className="analytics-chart__legend-dot analytics-chart__legend-dot--declined" />Rechazadas · {formatCount(totalDeclined)}</span>
      </div>
      {unavailable ? (
        <p className="analytics-chart__empty">No se pudo consultar el historial de simulaciones.</p>
      ) : values.every((value) => value === 0) ? (
        <p className="analytics-chart__empty">No hay simulaciones de pago en los últimos 28 días.</p>
      ) : (
        <ol className="analytics-week-bars">
          {weeks.map((week) => {
            const succeeded = week.succeeded ?? 0;
            const declined = week.declined ?? 0;
            const total = succeeded + declined;
            const width = (total / maximum) * 100;
            const successWidth = total ? (succeeded / total) * 100 : 0;
            return (
              <li className="analytics-week-bars__item" key={week.start}>
                <span className="analytics-week-bars__label">{week.label}</span>
                <div aria-label={`${formatCount(succeeded)} aprobadas, ${formatCount(declined)} rechazadas`} className="analytics-week-bars__track">
                  <span className="analytics-week-bars__stack" style={{ width: `${width}%` }}>
                    <i className="analytics-week-bars__success" style={{ width: `${successWidth}%` }} />
                    <i className="analytics-week-bars__declined" style={{ width: `${100 - successWidth}%` }} />
                  </span>
                </div>
                <strong>{formatCount(total)}</strong>
              </li>
            );
          })}
        </ol>
      )}
      <p className="analytics-chart__caption">Son pagos ficticios para probar el sistema; no representan cobros ni ingresos.</p>
    </figure>
  );
}
