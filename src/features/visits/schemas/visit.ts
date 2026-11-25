import { z } from "zod";
import { VISIT_STATUSES } from "@/features/visits/types/visit";

const uuid = z.string().uuid("La referencia de la visita no es válida.");
const futureIsoDate = z.string().refine((value) => Number.isFinite(Date.parse(value)), "Selecciona una fecha y hora válidas.");

export const requestVisitSchema = z.object({
  propertyId: uuid,
  startsAt: futureIsoDate,
  message: z.string().trim().max(1000, "El mensaje no puede superar 1000 caracteres.").optional().default(""),
});

export const manageVisitSchema = z.object({
  visitId: uuid,
  status: z.enum(["confirmed", "declined", "cancelled", "completed", "no_show"] satisfies readonly Exclude<(typeof VISIT_STATUSES)[number], "requested">[]),
  startsAt: futureIsoDate.optional().or(z.literal("")),
});

export const cancelVisitSchema = z.object({ visitId: uuid });
