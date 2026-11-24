import { z } from "zod";

const slugPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const benefitList = z
  .array(z.string().trim().min(1, "Cada beneficio debe tener texto.").max(120))
  .max(12, "Puedes indicar hasta 12 beneficios.");

export const cancelOwnSubscriptionSchema = z.object({
  confirm: z.literal("cancel"),
});

export const adminCancelSubscriptionSchema = z.object({
  subscriptionId: z.string().uuid("La suscripción no es válida."),
});

export const upsertSubscriptionPlanSchema = z.object({
  planId: z.string().uuid().optional(),
  slug: z
    .string()
    .trim()
    .min(3, "El identificador del plan es demasiado corto.")
    .max(80)
    .regex(slugPattern, "Usa solo minúsculas, números y guiones."),
  name: z.string().trim().min(3, "El nombre del plan es demasiado corto.").max(80),
  description: z.string().trim().max(400, "La descripción es demasiado larga.").default(""),
  price: z.coerce.number().min(0, "El precio simulado no puede ser negativo.").max(999999.99),
  durationDays: z.coerce.number().int().min(1).max(3650),
  benefits: benefitList,
  isActive: z.boolean(),
});

export type UpsertSubscriptionPlanInput = z.infer<typeof upsertSubscriptionPlanSchema>;
