import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isTrustedOrigin } from "@/lib/security/is-trusted-origin";
import { readLimitedBody } from "@/lib/security/read-limited-body";

const propertyViewSchema = z.object({
  propertyId: z.string().uuid(),
  sessionId: z.string().uuid(),
}).strict();

function noContent() {
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!isTrustedOrigin(request)) {
    return new Response(null, { status: 403, headers: { "Cache-Control": "no-store" } });
  }

  const mediaType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (mediaType !== "application/json") {
    return new Response(null, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  const rawBody = await readLimitedBody(request, 512);
  if (rawBody === null) {
    return new Response(null, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return new Response(null, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  const parsed = propertyViewSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(null, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.rpc("record_public_property_view", {
      target_property_id: parsed.data.propertyId,
      visitor_session_id: parsed.data.sessionId,
    });
    if (error) {
      console.error("[analytics] No se pudo registrar una vista", { code: error.code });
      return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } });
    }
  } catch {
    return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  return noContent();
}
