"use server";

import { revalidatePath } from "next/cache";
import { requireProfileRole } from "@/lib/permissions/access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cancelVisitSchema, manageVisitSchema, requestVisitSchema } from "@/features/visits/schemas/visit";
import type { AuthActionState } from "@/features/auth/types/auth-action";

const initialFailure = "No se pudo completar la operación. Revisa la fecha, la disponibilidad y vuelve a intentarlo.";

export async function requestPropertyVisitAction(_previous: AuthActionState, formData: FormData): Promise<AuthActionState> {
  await requireProfileRole(["client"]);
  const parsed = requestVisitSchema.safeParse({
    propertyId: formData.get("propertyId"),
    startsAt: formData.get("startsAt"),
    message: formData.get("message"),
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Revisa los datos de la visita." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("request_property_visit", {
    target_property_id: parsed.data.propertyId,
    proposed_starts_at: parsed.data.startsAt,
    client_message: parsed.data.message,
  });
  if (error) {
    console.error("[visits] No se pudo solicitar la visita", { code: error.code });
    if (error.message.includes("visit_time_unavailable")) return { status: "error", message: "Ese horario acaba de ocuparse. Elige otra hora." };
    if (error.message.includes("visit_time_out_of_range")) return { status: "error", message: "Elige una fecha a partir de dos horas desde ahora y dentro de los próximos 90 días." };
    if (error.message.includes("visit_request_rate_limited")) return { status: "error", message: "Alcanzaste el límite de cinco solicitudes activas en 24 horas." };
    return { status: "error", message: initialFailure };
  }
  revalidatePath("/mis-visitas");
  revalidatePath("/agente/visitas");
  revalidatePath("/admin/visitas");
  return { status: "success", message: "Solicitud enviada. El equipo confirmará el horario en tu cuenta." };
}

export async function changePropertyVisitAction(_previous: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const access = await requireProfileRole(["agent", "admin"]);
  const rawStartsAt = formData.get("startsAt");
  const parsed = manageVisitSchema.safeParse({ visitId: formData.get("visitId"), status: formData.get("status"), startsAt: rawStartsAt || undefined });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Revisa el cambio de estado." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("change_property_visit", {
    target_visit_id: parsed.data.visitId,
    next_status: parsed.data.status,
    replacement_starts_at: parsed.data.startsAt ? parsed.data.startsAt : null,
  });
  if (error) {
    console.error("[visits] No se pudo actualizar la visita", { code: error.code });
    if (error.message.includes("visit_time_unavailable")) return { status: "error", message: "Ese horario se cruza con otra visita. Elige otro." };
    return { status: "error", message: initialFailure };
  }
  const path = access.role === "admin" ? "/admin/visitas" : "/agente/visitas";
  revalidatePath(path);
  revalidatePath("/mis-visitas");
  revalidatePath("/notificaciones");
  return { status: "success", message: "La visita se actualizó correctamente." };
}

export async function cancelOwnVisitAction(_previous: AuthActionState, formData: FormData): Promise<AuthActionState> {
  await requireProfileRole(["client"]);
  const parsed = cancelVisitSchema.safeParse({ visitId: formData.get("visitId") });
  if (!parsed.success) return { status: "error", message: "La referencia de la visita no es válida." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("cancel_own_property_visit", { target_visit_id: parsed.data.visitId });
  if (error) {
    console.error("[visits] No se pudo cancelar la visita", { code: error.code });
    return { status: "error", message: "No se pudo cancelar. Solo puedes cancelar visitas pendientes o confirmadas antes de su inicio." };
  }
  revalidatePath("/mis-visitas");
  revalidatePath("/agente/visitas");
  revalidatePath("/admin/visitas");
  return { status: "success", message: "Visita cancelada." };
}
