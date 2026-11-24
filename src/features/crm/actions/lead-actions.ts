"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireProfileRole } from "@/lib/permissions/access";
import { submitPropertyInquirySchema, updateLeadStageSchema, addLeadNoteSchema } from "@/features/crm/schemas/lead";
import type { AuthActionState } from "@/features/auth/types/auth-action";
import { recordCustomerActivity } from "@/features/activity/services/customer-activity";

export async function submitPropertyInquiryAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = submitPropertyInquirySchema.safeParse({
    propertyId: formData.get("propertyId"),
    senderName: formData.get("senderName"),
    senderEmail: formData.get("senderEmail"),
    message: formData.get("message"),
    privacyConsent: formData.get("privacyConsent"),
    website: formData.get("website"),
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Revisa los datos de tu consulta." };
  if (parsed.data.website?.trim()) return { status: "success", message: "Gracias. Recibimos tu consulta." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("submit_property_inquiry", {
    target_property_id: parsed.data.propertyId,
    sender_name: parsed.data.senderName,
    sender_email: parsed.data.senderEmail,
    inquiry_message: parsed.data.message,
    privacy_consent: true,
  });
  if (error) {
    if (error.code === "22023" && error.message.includes("inquiry_rate_limited")) {
      return { status: "error", message: "Ya recibimos varias consultas recientes desde este correo. Intenta más tarde." };
    }
    if (error.code === "PGRST202" || error.code === "42883") {
      return { status: "error", message: "El formulario estará disponible cuando se aplique la migración de CRM." };
    }
    return { status: "error", message: "No se pudo enviar la consulta. Comprueba los datos e inténtalo de nuevo." };
  }
  await recordCustomerActivity("inquiry_sent", parsed.data.propertyId);
  revalidatePath("/mi-actividad");
  return { status: "success", message: "Gracias. Tu consulta fue enviada al equipo de Paradise." };
}

export async function updateLeadStageAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const access = await requireProfileRole(["agent", "admin"]);
  const parsed = updateLeadStageSchema.safeParse({ leadId: formData.get("leadId"), stage: formData.get("stage") });
  if (!parsed.success) return { status: "error", message: "El estado seleccionado no es válido." };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("leads")
    .update({ stage: parsed.data.stage })
    .eq("id", parsed.data.leadId)
    .select("id")
    .maybeSingle();
  if (error || !data) return { status: "error", message: "No se pudo cambiar el estado de este lead." };
  revalidatePath(access.role === "admin" ? "/admin/leads" : "/agente/leads");
  return { status: "success", message: "Estado actualizado." };
}

export async function addLeadNoteAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const access = await requireProfileRole(["agent", "admin"]);
  const parsed = addLeadNoteSchema.safeParse({ leadId: formData.get("leadId"), body: formData.get("body") });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Revisa la nota." };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("lead_interactions").insert({
    lead_id: parsed.data.leadId,
    actor_id: access.userId,
    kind: "note",
    body: parsed.data.body,
  }).select("id").maybeSingle();
  if (error || !data) return { status: "error", message: "No se pudo guardar la nota interna." };
  revalidatePath(access.role === "admin" ? "/admin/leads" : "/agente/leads");
  return { status: "success", message: "Nota interna agregada." };
}
