const FALLBACK_SITE_ORIGIN = "http://localhost:3000";

export function getSiteOrigin(): URL {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!configured) return new URL(FALLBACK_SITE_ORIGIN);

  try {
    const url = new URL(configured);
    if ((url.protocol !== "https:" && url.protocol !== "http:") || url.username || url.password) {
      return new URL(FALLBACK_SITE_ORIGIN);
    }
    return new URL(url.origin);
  } catch {
    return new URL(FALLBACK_SITE_ORIGIN);
  }
}

export function getCanonicalUrl(path: string): URL {
  return new URL(path.startsWith("/") ? path : `/${path}`, getSiteOrigin());
}
