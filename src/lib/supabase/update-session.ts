import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

export async function updateSupabaseSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const config = getSupabasePublicConfig();
  if (!config) return response;

  const supabase = createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, cacheHeaders) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
        for (const headerName of ["cache-control", "expires", "pragma"]) {
          const value = cacheHeaders?.[headerName];
          if (value) response.headers.set(headerName, value);
        }
      },
    },
  });

  // Refresh/verify the cookie session. Route authorization will use verified claims in its own server code.
  await supabase.auth.getClaims();
  return response;
}
