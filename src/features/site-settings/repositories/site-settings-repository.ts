import "server-only";

import { cache } from "react";
import { DEFAULT_SITE_SETTINGS, type SiteSettings } from "@/features/site-settings/schemas/site-settings";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function toSiteSettings(value: Record<string, unknown> | null): SiteSettings {
  if (!value) return DEFAULT_SITE_SETTINGS;
  return {
    siteName: typeof value.site_name === "string" ? value.site_name : DEFAULT_SITE_SETTINGS.siteName,
    tagline: typeof value.tagline === "string" ? value.tagline : DEFAULT_SITE_SETTINGS.tagline,
    seoDescription: typeof value.seo_description === "string" ? value.seo_description : DEFAULT_SITE_SETTINGS.seoDescription,
    publicEmail: typeof value.public_email === "string" ? value.public_email : "",
    publicPhone: typeof value.public_phone === "string" ? value.public_phone : "",
  };
}

export const getPublicSiteSettings = cache(async function getPublicSiteSettings(): Promise<SiteSettings> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.from("site_settings")
      .select("site_name, tagline, seo_description, public_email, public_phone")
      .eq("singleton", true)
      .maybeSingle();
    return toSiteSettings(data);
  } catch {
    return DEFAULT_SITE_SETTINGS;
  }
});

export async function getAdminSiteSettings(): Promise<SiteSettings> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("site_settings")
    .select("site_name, tagline, seo_description, public_email, public_phone")
    .eq("singleton", true)
    .maybeSingle();
  if (error && error.code !== "42P01" && error.code !== "PGRST205") {
    throw new Error("No se pudo consultar la configuración del sitio.");
  }
  return toSiteSettings(data);
}
