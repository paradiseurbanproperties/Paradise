export const VISIT_STATUSES = ["requested", "confirmed", "declined", "cancelled", "completed", "no_show"] as const;
export type VisitStatus = typeof VISIT_STATUSES[number];

export type VisitRecord = {
  id: string;
  propertyId: string;
  propertyTitle: string;
  propertySlug: string | null;
  city: string;
  clientName: string;
  clientEmail: string;
  startsAt: string;
  endsAt: string;
  status: VisitStatus;
  message: string;
  createdAt: string;
  history: Array<{ previousStatus: VisitStatus | null; newStatus: VisitStatus; previousStartsAt: string | null; newStartsAt: string; changedAt: string }>;
};

export const VISIT_STATUS_LABELS: Record<VisitStatus, string> = {
  requested: "Pendiente de confirmación",
  confirmed: "Confirmada",
  declined: "No aceptada",
  cancelled: "Cancelada",
  completed: "Realizada",
  no_show: "No se presentó",
};
