export const LEAD_STAGES = [
  "new",
  "contacted",
  "interested",
  "visit_scheduled",
  "negotiation",
  "closed",
  "lost",
] as const;

export type LeadStage = (typeof LEAD_STAGES)[number];

export const LEAD_STAGE_LABELS: Record<LeadStage, string> = {
  new: "Nuevo",
  contacted: "Contactado",
  interested: "Interesado",
  visit_scheduled: "Visita agendada",
  negotiation: "Negociación",
  closed: "Cerrado",
  lost: "No continuó",
};

export type CrmLead = {
  id: string;
  stage: LeadStage;
  contactName: string;
  contactEmail: string;
  message: string;
  createdAt: string;
  property: { title: string; slug: string; city: string } | null;
  interactions: Array<{ id: string; body: string; createdAt: string; actorId: string }>;
};
