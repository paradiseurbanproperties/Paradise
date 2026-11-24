"use server";

import { revalidatePath } from "next/cache";
import { requireActiveProfile } from "@/lib/permissions/access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { updateProfileSchema } from "@/features/users/schemas/profile";
import type { AuthActionState } from "@/features/auth/types/auth-action";

export async function updateProfileAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const access = await requireActiveProfile();
  const parsed = updateProfileSchema.safeParse({ displayName: formData.get("displayName") });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Revisa el nombre." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: parsed.data.displayName })
    .eq("id", access.userId);

  if (error) return { status: "error", message: "No se pudo guardar el perfil. Inténtalo de nuevo." };
  revalidatePath("/mi-cuenta");
  revalidatePath("/");
  return { status: "success", message: "Tu nombre se guardó correctamente." };
}
