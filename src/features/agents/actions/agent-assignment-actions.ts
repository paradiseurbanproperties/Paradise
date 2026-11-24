"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfileRole } from "@/lib/permissions/access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AuthActionState } from "@/features/auth/types/auth-action";

const assignSchema = z.object({
  agentId: z.string().uuid("Selecciona una cuenta de agente válida."),
  propertyId: z.string().uuid("Selecciona una propiedad válida."),
});

const revokeSchema = z.object({ assignmentId: z.string().uuid("La asignación no es válida.") });

export async function assignPropertyToAgentAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const admin = await requireProfileRole(["admin"]);
  const parsed = assignSchema.safeParse({ agentId: formData.get("agentId"), propertyId: formData.get("propertyId") });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Revisa los datos de asignación." };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("agent_assignments").insert({
    agent_id: parsed.data.agentId,
    property_id: parsed.data.propertyId,
    assigned_by: admin.userId,
  }).select("id").maybeSingle();

  if (error) {
    if (error.code === "23505") return { status: "error", message: "Esta propiedad ya está asignada a ese agente." };
    return { status: "error", message: "No se pudo asignar la propiedad. Verifica que el agente esté activo y que exista la propiedad." };
  }
  if (!data) return { status: "error", message: "No se confirmó la asignación." };

  revalidatePath("/admin/agentes");
  revalidatePath("/agente");
  return { status: "success", message: "Propiedad asignada." };
}

export async function revokePropertyAssignmentAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  await requireProfileRole(["admin"]);
  const parsed = revokeSchema.safeParse({ assignmentId: formData.get("assignmentId") });
  if (!parsed.success) return { status: "error", message: "La asignación no es válida." };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("agent_assignments")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", parsed.data.assignmentId)
    .is("revoked_at", null)
    .select("id")
    .maybeSingle();

  if (error || !data) return { status: "error", message: "No se pudo retirar la asignación activa." };
  revalidatePath("/admin/agentes");
  revalidatePath("/agente");
  return { status: "success", message: "Asignación retirada. El registro histórico se conserva." };
}
