import { getSiteOrigin } from "@/lib/seo/site-url";

export function isTrustedOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  if (origin === getSiteOrigin().origin) return true;
  if (process.env.NODE_ENV !== "development") return false;

  const requestHost = request.headers.get("host");
  if (!requestHost) return false;

  try {
    const parsedOrigin = new URL(origin);
    return (parsedOrigin.protocol === "http:" || parsedOrigin.protocol === "https:")
      && parsedOrigin.host === requestHost;
  } catch {
    return false;
  }
}
