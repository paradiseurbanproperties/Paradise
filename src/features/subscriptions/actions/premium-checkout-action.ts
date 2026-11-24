"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfileRole } from "@/lib/permissions/access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PremiumCheckoutState } from "@/features/subscriptions/types/action-state";

const checkoutSchema = z.object({
  planId: z.string().uuid(),
  simulatedResult: z.enum(["succeeded", "declined"]),
});

export async function simulatePremiumCheckoutAction(
  _previousState: PremiumCheckoutState,
  formData: FormData,
): Promise<PremiumCheckoutState> {
  await requireProfileRole(["client"]);
  const parsed = checkoutSchema.safeParse({
    planId: formData.get("planId"),
    simulatedResult: formData.get("simulatedResult"),
  });

  if (!parsed.success) {
    return { status: "error", message: "Selecciona un plan y un resultado de prueba válido." };
  }

  let checkoutConfirmed = false;
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.rpc("simulate_premium_checkout", {
      selected_plan_id: parsed.data.planId,
      simulated_result: parsed.data.simulatedResult,
    });

    if (error) {
      console.error("[subscriptions] Falló el checkout simulado", { code: error.code });
      const message = error.code === "PGRST202" || error.code === "42883"
        ? "Supabase no encuentra la función de pagos. Confirma que 0006 está aplicada y actualiza la caché de API del proyecto."
        : error.code === "42501"
          ? "Esta simulación requiere una cuenta Cliente activa."
          : error.code === "P0002"
            ? "El plan ya no está disponible. Recarga la página y elige un plan activo."
            : "No se pudo completar el pago de prueba. Inténtalo nuevamente.";
      return {
        status: "error",
        message,
        planId: parsed.data.planId,
      };
    }
    checkoutConfirmed = true;

    revalidatePath("/premium");
    revalidatePath("/mi-cuenta");
    revalidatePath("/admin/suscripciones");
    revalidatePath("/propiedades");
    revalidatePath("/propiedades/mapa");
    return parsed.data.simulatedResult === "succeeded"
      ? { status: "success", message: "Pago de prueba aprobado. Tu acceso Premium quedó activado.", planId: parsed.data.planId }
      : { status: "declined", message: "Pago de prueba rechazado. No se activó la suscripción ni hubo ningún cobro.", planId: parsed.data.planId };
  } catch (error) {
    console.error("[subscriptions] Excepción durante el checkout", {
      name: error instanceof Error ? error.name : "unknown",
    });
    return {
      status: "error",
      message: checkoutConfirmed
        ? "El resultado quedó registrado. Recarga esta página para ver el estado actualizado."
        : "No se recibió confirmación del servidor. Revisa el historial antes de volver a intentar.",
      planId: parsed.data.planId,
    };
  }
}
