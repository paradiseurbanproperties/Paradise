import { z } from "zod";
import { LEAD_STAGES } from "@/features/crm/types/lead";

export const submitPropertyInquirySchema = z.object({
  propertyId: z.string().uuid("La propiedad no es válida."),
  senderName: z.string().trim().min(2, "Escribe tu nombre.").max(120),
  senderEmail: z.email("Escribe un correo válido.").max(254),
  message: z.string().trim().min(5, "Cuéntanos un poco más sobre tu interés.").max(2000),
  privacyConsent: z.enum(["on"], { error: "Acepta el aviso de privacidad para enviar tu consulta." }),
  website: z.string().max(200).optional(),
});

export const updateLeadStageSchema = z.object({
  leadId: z.string().uuid(),
  stage: z.enum(LEAD_STAGES),
});

export const addLeadNoteSchema = z.object({
  leadId: z.string().uuid(),
  body: z.string().trim().min(1, "La nota no puede estar vacía.").max(2000, "La nota no puede superar 2000 caracteres."),
});
