export type NotificationType = "premium_activated" | "premium_cancelled" | "inquiry_stage_changed";

export type NotificationEntry = {
  id: string;
  notificationType: NotificationType;
  propertyId: string | null;
  stage: string | null;
  createdAt: string;
  readAt: string | null;
};
