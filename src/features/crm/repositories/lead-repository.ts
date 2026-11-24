import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { LEAD_STAGES, type CrmLead, type LeadStage } from "@/features/crm/types/lead";

type LeadRow = {
  id: string;
  stage: string;
  contact_name: string;
  contact_email: string;
  message: string;
  created_at: string;
  properties: { title: string; slug: string; city: string } | null;
  lead_interactions: Array<{ id: string; body: string; created_at: string; actor_id: string }>;
};

export async function listCrmLeads(): Promise<{ leads: CrmLead[]; unavailable: boolean }> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("leads")
    .select("id, stage, contact_name, contact_email, message, created_at, properties(title, slug, city), lead_interactions(id, body, created_at, actor_id)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("[crm] No se pudieron cargar los leads", { code: error.code });
    return { leads: [], unavailable: true };
  }

  const rows = (data ?? []) as unknown as LeadRow[];
  return {
    unavailable: false,
    leads: rows.flatMap((row) => {
      if (!LEAD_STAGES.includes(row.stage as LeadStage)) return [];
      return [{
        id: row.id,
        stage: row.stage as LeadStage,
        contactName: row.contact_name,
        contactEmail: row.contact_email,
        message: row.message,
        createdAt: row.created_at,
        property: row.properties,
        interactions: [...(row.lead_interactions ?? [])]
          .sort((left, right) => left.created_at.localeCompare(right.created_at))
          .map((interaction) => ({
            id: interaction.id,
            body: interaction.body,
            createdAt: interaction.created_at,
            actorId: interaction.actor_id,
          })),
      }];
    }),
  };
}
