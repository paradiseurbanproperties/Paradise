import "server-only";

import { getCurrentAccessContext } from "@/lib/permissions/access";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CustomerActivityType = "property_viewed" | "favorite_added" | "favorite_removed" | "inquiry_sent";
export type CustomerActivityEntry = {
  id: string;
  activityType: CustomerActivityType;
  propertyId: string | null;
  createdAt: string;
};

export async function listOwnCustomerActivity(): Promise<{ entries: CustomerActivityEntry[]; unavailable: boolean }> {
  const access = await getCurrentAccessContext();
  if (!access || access.role !== "client" || access.status !== "active" || !getSupabasePublicConfig()) {
    return { entries: [], unavailable: false };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("user_activity")
    .select("id,activity_type,property_id,created_at")
    .eq("user_id", access.userId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    console.error("[activity] No se pudo cargar el historial", { code: error.code });
    return { entries: [], unavailable: true };
  }

  return {
    entries: (data ?? []).flatMap((row) => {
      if (!isCustomerActivityType(row.activity_type)) return [];
      return [{ id: row.id, activityType: row.activity_type, propertyId: row.property_id, createdAt: row.created_at }];
    }),
    unavailable: false,
  };
}

function isCustomerActivityType(value: string): value is CustomerActivityType {
  return value === "property_viewed" || value === "favorite_added" || value === "favorite_removed" || value === "inquiry_sent";
}
