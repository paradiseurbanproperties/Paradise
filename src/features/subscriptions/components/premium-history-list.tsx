import type { SubscriptionHistoryItem, SubscriptionStatus } from "@/features/subscriptions/repositories/subscription-repository";

const statusLabels: Record<SubscriptionStatus, string> = {
  active: "Activa",
  pending: "Pendiente",
  expired: "Vencida",
  cancelled: "Cancelada",
};

function dateLabel(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function moneyLabel(amount: number, currency: string): string {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

export function PremiumHistoryList({ items }: { items: SubscriptionHistoryItem[] }) {
  if (!items.length) {
    return <p className="premium-history__empty">Todavía no hay intentos de pago de prueba en esta cuenta.</p>;
  }

  return (
    <ol className="premium-history">
      {items.map((item) => (
        <li className="premium-history__item" key={item.id}>
          <div>
            <strong>{item.planName}</strong>
            <p>
              {statusLabels[item.status]}
              {item.simulation
                ? ` · Pago de prueba ${item.simulation.result === "succeeded" ? "aprobado" : "rechazado"} (${moneyLabel(item.simulation.amount, item.simulation.currency)})`
                : " · Sin simulación asociada"}
            </p>
            <small>
              Creada {dateLabel(item.createdAt)}
              {item.startsAt ? ` · Inicio ${dateLabel(item.startsAt)}` : ""}
              {item.expiresAt ? ` · Fin ${dateLabel(item.expiresAt)}` : ""}
              {item.simulation ? ` · Ref. ${item.simulation.reference}` : ""}
            </small>
          </div>
        </li>
      ))}
    </ol>
  );
}