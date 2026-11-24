"use server";

import { revalidatePath } from "next/cache";
import { siteSettingsSchema } from "@/features/site-settings/schemas/site-settings";
import { requireProfileRole } from "@/lib/permissions/access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AuthActionState } from "@/features/auth/types/auth-action";

export async function saveSiteSettingsAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const actor = await requireProfileRole(["admin"]);
  const parsed = siteSettingsSchema.safeParse({
    siteName: formData.get("siteName"),
    tagline: formData.get("tagline"),
    seoDescription: formData.get("seoDescription"),
    publicEmail: formData.get("publicEmail"),
    publicPhone: formData.get("publicPhone"),
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Revisa la configuración." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("site_settings").upsert({
    singleton: true,
    site_name: parsed.data.siteName,
    tagline: parsed.data.tagline,
    seo_description: parsed.data.seoDescription,
    public_email: parsed.data.publicEmail,
    public_phone: parsed.data.publicPhone,
    updated_by: actor.userId,
  }, { onConflict: "singleton" });

  if (error) {
    if (error.code === "42P01" || error.code === "PGRST205") {
      return { status: "error", message: "La configuración requiere la migración 0018 en Supabase." };
    }
    return { status: "error", message: "No se pudo guardar. Revisa que la migración 0018 esté aplicada." };
  }

  revalidatePath("/");
  revalidatePath("/admin/configuracion");
  revalidatePath("/sitemap.xml");
  return { status: "success", message: "Configuración del sitio guardada." };
}
