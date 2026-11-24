"use server";

import { revalidatePath } from "next/cache";
import { requireProfileRole } from "@/lib/permissions/access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notificationIdSchema } from "@/features/notifications/schemas/notification";

export async function markNotificationReadAction(formData: FormData): Promise<void> {
  const access = await requireProfileRole(["client"]);
  const parsed = notificationIdSchema.safeParse(formData.get("notificationId"));
  if (!parsed.success) return;

  const supabase = await createSupabaseServerClient();
  await supabase.from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", parsed.data)
    .eq("user_id", access.userId)
    .is("read_at", null);
  revalidatePath("/notificaciones");
}

export async function markAllNotificationsReadAction(): Promise<void> {
  const access = await requireProfileRole(["client"]);
  const supabase = await createSupabaseServerClient();
  await supabase.from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", access.userId)
    .is("read_at", null);
  revalidatePath("/notificaciones");
}
