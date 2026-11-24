import "server-only";

import { getCurrentAccessContext } from "@/lib/permissions/access";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CustomerActivityType = "property_viewed" | "favorite_added" | "favorite_removed" | "inquiry_sent";

export async function recordCustomerActivity(type: CustomerActivityType, propertyId: string): Promise<void> {
  const access = await getCurrentAccessContext();
  if (!access || access.role !== "client" || access.status !== "active" || !getSupabasePublicConfig()) return;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("record_customer_activity", {
    target_activity_type: type,
    target_property_id: propertyId,
  });
  if (error) console.error("[activity] No se pudo guardar la actividad", { code: error.code, type });
}
