import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { VisitRecord, VisitStatus } from "@/features/visits/types/visit";

type VisitRow = {
  id: string; property_id: string; contact_name: string; contact_email: string;
  starts_at: string; ends_at: string; status: VisitStatus; message: string; created_at: string;
  properties: { title: string; slug: string; city: string } | null;
  visit_request_history: Array<{ previous_status: VisitStatus | null; new_status: VisitStatus; previous_starts_at: string | null; new_starts_at: string; changed_at: string }>;
};

export async function listVisits(scope: "own" | "team"): Promise<{ visits: VisitRecord[]; unavailable: boolean }> {
  const supabase = await createSupabaseServerClient();
  let query = supabase.from("visit_requests")
    .select("id,property_id,contact_name,contact_email,starts_at,ends_at,status,message,created_at,properties(title,slug,city),visit_request_history(previous_status,new_status,previous_starts_at,new_starts_at,changed_at)")
    .order("starts_at", { ascending: true }).limit(200);
  if (scope === "own") query = query.order("created_at", { ascending: false });
  const { data, error } = await query;
  if (error) {
    console.error("[visits] No se pudieron consultar las visitas", { code: error.code });
    return { visits: [], unavailable: true };
  }
  return {
    unavailable: false,
    visits: ((data ?? []) as unknown as VisitRow[]).map((row) => ({
      id: row.id,
      propertyId: row.property_id,
      propertyTitle: row.properties?.title ?? "Propiedad no disponible",
      propertySlug: row.properties?.slug ?? null,
      city: row.properties?.city ?? "",
      clientName: row.contact_name,
      clientEmail: row.contact_email,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      status: row.status,
      message: row.message,
      createdAt: row.created_at,
      history: [...(row.visit_request_history ?? [])]
        .sort((a, b) => a.changed_at.localeCompare(b.changed_at))
        .map((item) => ({
          previousStatus: item.previous_status,
          newStatus: item.new_status,
          previousStartsAt: item.previous_starts_at,
          newStartsAt: item.new_starts_at,
          changedAt: item.changed_at,
        })),
    })),
  };
}
