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
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configuredUrl) {
    try {
      const url = new URL(configuredUrl);
      if (url.protocol === "https:" || url.hostname === "localhost" || url.hostname === "127.0.0.1") {
        return url.origin;
      }
    } catch {
      // Use local development origin until the deployment URL is set correctly.
    }
  }
  return "http://localhost:3000";
}

export function createAuthRedirectUrl(path: string): string {
  const url = new URL(path, getPublicSiteUrl());
  return url.toString();
}
