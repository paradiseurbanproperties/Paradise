import { z } from "zod";

export const updateProfileSchema = z.object({
  displayName: z.string().trim().min(2, "Escribe al menos 2 caracteres.").max(120, "Usa 120 caracteres o menos."),
});
