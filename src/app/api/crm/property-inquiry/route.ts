import { NextResponse } from "next/server";
import { notifyProjectOfInquiry } from "@/features/crm/services/inquiry-email";
import { revalidatePath } from "next/cache";
import { submitPropertyInquirySchema } from "@/features/crm/schemas/lead";
import { recordCustomerActivity } from "@/features/activity/services/customer-activity";
import { isTrustedOrigin } from "@/lib/security/is-trusted-origin";
import { readLimitedBody } from "@/lib/security/read-limited-body";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const responseHeaders = { "Cache-Control": "no-store" };

function reply(status: number, message: string) {
  return NextResponse.json({ status: status < 400 ? "success" : "error", message }, {
    status,
    headers: responseHeaders,
  });
}

export async function POST(request: Request) {
  if (!isTrustedOrigin(request)) return reply(403, "No se pudo validar el origen de la solicitud.");

  const mediaType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (mediaType !== "application/json") return reply(400, "El formato de la solicitud no es válido.");

  const rawBody = await readLimitedBody(request, 4096);
  if (rawBody === null) return reply(400, "La solicitud está vacía o supera el tamaño permitido.");

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return reply(400, "El formato de la solicitud no es válido.");
  }

  const parsed = submitPropertyInquirySchema.safeParse(body);
  if (!parsed.success) {
    return reply(400, parsed.error.issues[0]?.message ?? "Revisa los datos de tu consulta.");
  }
  if (parsed.data.website?.trim()) return reply(200, "Gracias. Recibimos tu consulta.");

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.rpc("submit_property_inquiry", {
      target_property_id: parsed.data.propertyId,
      sender_name: parsed.data.senderName,
      sender_email: parsed.data.senderEmail,
      inquiry_message: parsed.data.message,
      privacy_consent: true,
    });

    if (error) {
      if (error.code === "22023" && error.message.includes("inquiry_rate_limited")) {
        return reply(429, "Ya recibimos varias consultas recientes desde este correo. Intenta más tarde.");
      }
      if (error.code === "PGRST202" || error.code === "42883") {
        return reply(503, "El formulario estará disponible cuando se aplique la migración de CRM.");
      }
      return reply(503, "No se pudo enviar la consulta. Comprueba los datos e inténtalo de nuevo.");
    }

    // El lead ya quedó guardado. Un fallo de SMTP no debe duplicarlo ni perderlo.
    await notifyProjectOfInquiry({
      senderName: parsed.data.senderName,
      senderEmail: parsed.data.senderEmail,
      message: parsed.data.message,
      propertyId: parsed.data.propertyId,
    });
    await recordCustomerActivity("inquiry_sent", parsed.data.propertyId);
    revalidatePath("/mi-actividad");
    return reply(201, "Gracias. Tu consulta fue enviada al equipo de Paradise.");
  } catch {
    return reply(503, "No se pudo enviar la consulta. Inténtalo de nuevo más tarde.");
  }
}
