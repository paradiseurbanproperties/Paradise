import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

const allowedNextPaths = new Set(["/", "/verificar-email", "/auth/cambiar-password"]);

function verificationError(request: NextRequest) {
  return NextResponse.redirect(new URL("/login?auth-error=verification", request.url));
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = request.nextUrl.searchParams.get("next") ?? "/";
  const destination = allowedNextPaths.has(next) ? next : "/";

  if (request.nextUrl.searchParams.has("error")) return verificationError(request);
  if (!getSupabasePublicConfig() || !code) return verificationError(request);

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return verificationError(request);
  } catch {
    return verificationError(request);
  }

  const redirectUrl = new URL(destination, request.url);
  if (destination === "/verificar-email") redirectUrl.searchParams.set("verified", "1");
  return NextResponse.redirect(redirectUrl);
}
