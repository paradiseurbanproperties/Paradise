import { getPublicSiteUrl } from "@/lib/supabase/config";

export function getSiteOrigin(): URL {
  return new URL(getPublicSiteUrl());
}

export function getCanonicalUrl(path: string): URL {
  return new URL(path.startsWith("/") ? path : `/${path}`, getSiteOrigin());
}
