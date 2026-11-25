import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

const allowedNextPaths = new Set(["/", "/verificar-email", "/auth/cambiar-password"]);

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  const type = params.get("type");
  const next = params.get("next") ?? "/verificar-email";
  let destination = allowedNextPaths.has(next) ? next : "/";
  const recovery = type === "recovery" || destination === "/auth/cambiar-password";

  function finish(path: string) {
    const response = NextResponse.redirect(new URL(path, request.url));
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  }
  function failed(error?: { code?: string; status?: number }) {
    if (error) console.error("[auth:callback] Verification failed", { code: error.code, status: error.status });
    return finish(recovery ? "/recuperar-password?expired=1" : "/login?auth-error=verification");
  }

  if (params.has("error") || !getSupabasePublicConfig()) return failed();
  try {
    const supabase = await createSupabaseServerClient();
    if (tokenHash && (type === "recovery" || type === "email" || type === "signup")) {
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
      if (error) return failed(error);
      destination = type === "recovery" ? "/auth/cambiar-password" : "/verificar-email";
    } else if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) return failed(error);
      // Supabase persists the recovery intent with the PKCE verifier cookie.
      if ("redirectType" in data && data.redirectType === "recovery") destination = "/auth/cambiar-password";
    } else {
      return failed();
    }
  } catch {
    return failed();
  }

  return finish(destination === "/verificar-email" ? "/verificar-email?verified=1" : destination);
}
