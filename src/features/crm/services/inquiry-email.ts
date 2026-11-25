import "server-only";

import nodemailer from "nodemailer";

const projectEmail = "paradiseurbanproperties@gmail.com";

type Inquiry = {
  senderName: string;
  senderEmail: string;
  message: string;
  propertyId: string;
};

export async function notifyProjectOfInquiry(inquiry: Inquiry): Promise<boolean> {
  const appPassword = process.env.CRM_GMAIL_APP_PASSWORD?.replace(/\s/g, "");
  if (!appPassword) return false;

  const transport = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: projectEmail, pass: appPassword },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });

  try {
    await transport.sendMail({
      from: `Paradise <${projectEmail}>`,
      to: projectEmail,
      replyTo: { name: inquiry.senderName, address: inquiry.senderEmail },
      subject: "Nueva solicitud de información en Paradise",
      text: [
        `Nombre: ${inquiry.senderName}`,
        `Correo: ${inquiry.senderEmail}`,
        `ID del inmueble: ${inquiry.propertyId}`,
        "",
        inquiry.message,
        "",
        "La solicitud también está guardada en el CRM de Paradise.",
      ].join("\n"),
    });
    return true;
  } catch (error) {
    console.error("[crm:email] No se pudo enviar el aviso", {
      code: error && typeof error === "object" && "code" in error ? String(error.code) : "unknown",
    });
    return false;
  } finally {
    transport.close();
  }
}
