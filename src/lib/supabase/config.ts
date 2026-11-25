export type SupabasePublicConfig = {
  url: string;
  publishableKey: string;
};

function isConfiguredValue(value: string | undefined): value is string {
  return Boolean(value && value.trim() && !value.includes("<") && !value.includes(">"));
}

export function getSupabasePublicConfig(): SupabasePublicConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!isConfiguredValue(url) || !isConfiguredValue(publishableKey)) return null;

  try {
    const parsedUrl = new URL(url);
    const isLocalHttp =
      parsedUrl.protocol === "http:" &&
      (parsedUrl.hostname === "localhost" || parsedUrl.hostname === "127.0.0.1");
    if (parsedUrl.protocol !== "https:" && !isLocalHttp) return null;
    return { url: parsedUrl.origin, publishableKey };
  } catch {
    return null;
  }
}

export function getPublicSiteUrl(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.VERCEL_ENV === "production"
      ? process.env.VERCEL_PROJECT_PRODUCTION_URL
      : process.env.NEXT_PUBLIC_VERCEL_URL,
    process.env.VERCEL_URL,
  ];
  const isVercel = process.env.VERCEL === "1" || Boolean(process.env.VERCEL_URL);

  for (const candidate of candidates) {
    const configuredUrl = candidate?.trim();
    if (!configuredUrl) continue;
    try {
      const hasScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(configuredUrl);
      const url = new URL(hasScheme ? configuredUrl : `https://${configuredUrl}`);
      const isLocalHttp = url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1");
      if (url.protocol === "https:" || (isLocalHttp && !isVercel)) {
        return url.origin;
      }
    } catch {
      // Try the next deployment URL candidate.
    }
  }
  return "http://localhost:3000";
}

export function createAuthRedirectUrl(path: string): string {
  const url = new URL(path, getPublicSiteUrl());
  return url.toString();
}
