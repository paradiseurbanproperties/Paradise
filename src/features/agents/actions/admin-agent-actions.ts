"use server";

import { revalidatePath } from "next/cache";
import { requireProfileRole } from "@/lib/permissions/access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { adminAgentProfileSchema } from "@/features/agents/schemas/agent-profile";
import type { AuthActionState } from "@/features/auth/types/auth-action";

export async function saveAgentProfileAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  await requireProfileRole(["admin"]);
  const parsed = adminAgentProfileSchema.safeParse({
    profileId: formData.get("profileId"),
    slug: formData.get("slug"),
    publicName: formData.get("publicName"),
    biography: formData.get("biography"),
    specialties: formData.get("specialties"),
    serviceAreas: formData.get("serviceAreas"),
    isPublic: formData.get("isPublic"),
  });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Revisa los datos del perfil." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("agents").upsert({
    profile_id: parsed.data.profileId,
    slug: parsed.data.slug,
    public_name: parsed.data.publicName,
    biography: parsed.data.biography,
    specialties: parsed.data.specialties,
    service_areas: parsed.data.serviceAreas,
    is_public: parsed.data.isPublic,
  }, { onConflict: "profile_id" });

  if (error) {
    if (error.code === "23505") return { status: "error", message: "Ese enlace ya está asignado a otro agente." };
    if (error.code === "42P01" || error.code === "PGRST205") {
      return { status: "error", message: "La tabla de agentes aún no está disponible. Aplica la migración 0011 en Supabase." };
    }
    return { status: "error", message: "No se pudo guardar el perfil. Revisa la migración y los permisos de Supabase." };
  }

  revalidatePath("/admin/agentes");
  revalidatePath("/agentes");
  revalidatePath(`/agentes/${parsed.data.slug}`);
  return { status: "success", message: "Perfil profesional guardado." };
}
