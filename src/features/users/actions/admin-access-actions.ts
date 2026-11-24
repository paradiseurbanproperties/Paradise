"use server";

import { revalidatePath } from "next/cache";
import { requireProfileRole } from "@/lib/permissions/access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { updateAccountAccessSchema } from "@/features/users/schemas/access";
import type { AuthActionState } from "@/features/auth/types/auth-action";

export async function updateAccountAccessAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const actor = await requireProfileRole(["admin"]);
  const parsed = updateAccountAccessSchema.safeParse({
    targetUserId: formData.get("targetUserId"),
    role: formData.get("role"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Revisa los datos." };
  }
  if (parsed.data.targetUserId === actor.userId) {
    return { status: "error", message: "Tu propia cuenta no puede cambiarse desde esta operación." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_set_profile_access", {
    target_user_id: parsed.data.targetUserId,
    new_base_role: parsed.data.role,
    new_account_status: parsed.data.status,
  });

  if (error) return { status: "error", message: "No se pudo actualizar el acceso de esa cuenta." };
  revalidatePath("/admin/usuarios");
  return { status: "success", message: "Se actualizó el acceso de la cuenta." };
}
