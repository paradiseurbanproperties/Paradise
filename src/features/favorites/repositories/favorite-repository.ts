import "server-only";

import { getCurrentAccessContext } from "@/lib/permissions/access";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function listOwnFavoritePropertyIds(): Promise<{ ids: string[]; unavailable: boolean }> {
  const access = await getCurrentAccessContext();
  if (!access || access.role !== "client" || access.status !== "active" || !getSupabasePublicConfig()) {
    return { ids: [], unavailable: false };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("favorites").select("property_id").order("created_at", { ascending: false });
  if (error) {
    console.error("[favorites] No se pudieron cargar los favoritos", { code: error.code });
    return { ids: [], unavailable: true };
  }
  return { ids: (data ?? []).map((row) => row.property_id), unavailable: false };
}
