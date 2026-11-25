"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireProfileRole } from "@/lib/permissions/access";
import { updateLeadStageSchema, addLeadNoteSchema } from "@/features/crm/schemas/lead";
import type { AuthActionState } from "@/features/auth/types/auth-action";

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
