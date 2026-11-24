"use server";

import { revalidatePath } from "next/cache";
import { requireProfileRole } from "@/lib/permissions/access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  adminCancelSubscriptionSchema,
  cancelOwnSubscriptionSchema,
  upsertSubscriptionPlanSchema,
} from "@/features/subscriptions/schemas/subscription";
import type { AuthActionState } from "@/features/auth/types/auth-action";

function revalidatePremiumViews() {
  revalidatePath("/premium");
  revalidatePath("/mi-cuenta");
  revalidatePath("/admin/suscripciones");
  revalidatePath("/propiedades");
  revalidatePath("/propiedades/mapa");
}

function parseBenefits(value: FormDataEntryValue | null): string[] {
  return String(value ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export async function cancelOwnPremiumSubscriptionAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  await requireProfileRole(["client"]);
  const parsed = cancelOwnSubscriptionSchema.safeParse({
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return { status: "error", message: "Confirma que deseas cancelar la suscripción de prueba." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("cancel_own_premium_subscription");
  if (error) {
    console.error("[subscriptions] Falló la cancelación", { code: error.code });
    return {
      status: "error",
      message: error.code === "PGRST202"
        ? "Aplica la migración 0007 de cancelación Premium y vuelve a intentarlo."
        : "No hay una suscripción vigente para cancelar, o no se pudo completar la operación.",
    };
  }

  revalidatePremiumViews();
  return { status: "success", message: "Se canceló el acceso Premium de prueba. No hubo cargos ni reembolsos." };
}

export async function adminCancelPremiumSubscriptionAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  await requireProfileRole(["admin"]);
  const parsed = adminCancelSubscriptionSchema.safeParse({
    subscriptionId: formData.get("subscriptionId"),
  });
  if (!parsed.success) {
    return { status: "error", message: "La suscripción seleccionada no es válida." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_cancel_premium_subscription", {
    target_subscription_id: parsed.data.subscriptionId,
  });
  if (error) {
    console.error("[subscriptions] Falló la cancelación administrativa", { code: error.code });
    return {
      status: "error",
      message: error.code === "PGRST202"
        ? "Aplica la migración 0007 de cancelación Premium y vuelve a intentarlo."
        : "No se pudo cancelar esa suscripción de prueba.",
    };
  }

  revalidatePremiumViews();
  return { status: "success", message: "La suscripción de prueba quedó cancelada." };
}

export async function upsertSubscriptionPlanAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  await requireProfileRole(["admin"]);
  const planIdValue = String(formData.get("planId") ?? "").trim();
  const parsed = upsertSubscriptionPlanSchema.safeParse({
    planId: planIdValue || undefined,
    slug: formData.get("slug"),
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    price: formData.get("price"),
    durationDays: formData.get("durationDays"),
    benefits: parseBenefits(formData.get("benefits")),
    isActive: formData.get("isActive") === "on",
  });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Revisa los datos del plan." };
  }

  let planSaved = false;
  try {
    const supabase = await createSupabaseServerClient();
    const payload = {
      slug: parsed.data.slug,
      name: parsed.data.name,
      description: parsed.data.description,
      price: parsed.data.price,
      currency: "MXN",
      duration_days: parsed.data.durationDays,
      benefits: parsed.data.benefits,
      is_active: parsed.data.isActive,
    };

    const result = parsed.data.planId
      ? await supabase.from("subscription_plans").update(payload).eq("id", parsed.data.planId).select("id").maybeSingle()
      : await supabase.from("subscription_plans").insert(payload).select("id").single();

    if (result.error || !result.data) {
      const code = result.error?.code;
      console.error("[subscriptions] No se pudo guardar el plan", { code });
      return {
        status: "error",
        message: code === "23505"
          ? "Ya existe un plan con ese identificador."
          : code === "42501"
            ? "Supabase rechazó el cambio. Confirma que tu perfil tiene rol Admin activo."
            : code === "PGRST205" || code === "42P01" || code === "PGRST204"
              ? "Supabase no encuentra la tabla o sus columnas. Confirma que 0006 está aplicada y actualiza la caché de API del proyecto."
              : !code
                ? "No se guardaron cambios. Confirma que el plan existe y que tu perfil tiene rol Admin activo."
                : "No se pudo guardar el plan. Revisa la configuración de Supabase y vuelve a intentarlo.",
      };
    }
    planSaved = true;

    revalidatePremiumViews();
    return { status: "success", message: parsed.data.planId ? "Se actualizó el plan." : "Se creó el plan de demostración." };
  } catch (error) {
    console.error("[subscriptions] Excepción al guardar el plan", {
      name: error instanceof Error ? error.name : "unknown",
    });
    return {
      status: "error",
      message: planSaved
        ? "El plan se guardó. Recarga esta página para ver los cambios."
        : "No se recibió confirmación de Supabase. Recarga y comprueba si el plan aparece antes de volver a enviarlo.",
    };
  }
}
