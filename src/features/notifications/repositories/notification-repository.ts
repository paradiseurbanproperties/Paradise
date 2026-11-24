import "server-only";

import { getCurrentAccessContext } from "@/lib/permissions/access";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { NotificationEntry, NotificationType } from "@/features/notifications/types/notification";

export async function listOwnNotifications(): Promise<{ notifications: NotificationEntry[]; unreadCount: number; unavailable: boolean }> {
  const access = await getCurrentAccessContext();
  if (!access || access.role !== "client" || access.status !== "active" || !getSupabasePublicConfig()) {
    return { notifications: [], unreadCount: 0, unavailable: false };
  }

  const supabase = await createSupabaseServerClient();
  const [{ data, error }, { count, error: countError }] = await Promise.all([
    supabase.from("notifications")
      .select("id,notification_type,property_id,stage,created_at,read_at")
      .eq("user_id", access.userId)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", access.userId)
      .is("read_at", null),
  ]);
  if (error || countError) {
    return { notifications: [], unreadCount: 0, unavailable: true };
  }

  return {
    notifications: (data ?? []).flatMap((row) => {
      if (!isNotificationType(row.notification_type)) return [];
      return [{ id: row.id, notificationType: row.notification_type, propertyId: row.property_id, stage: row.stage, createdAt: row.created_at, readAt: row.read_at }];
    }),
    unreadCount: count ?? 0,
    unavailable: false,
  };
}

export async function getOwnUnreadNotificationCount(userId: string): Promise<number> {
  if (!getSupabasePublicConfig()) return 0;
  const supabase = await createSupabaseServerClient();
  const { count, error } = await supabase.from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);
  return error ? 0 : count ?? 0;
}

function isNotificationType(value: string): value is NotificationType {
  return value === "premium_activated" || value === "premium_cancelled" || value === "inquiry_stage_changed";
}
