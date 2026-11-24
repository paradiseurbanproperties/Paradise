import { z } from "zod";

const lines = (maximum: number) => z.string().max(5000).transform((value) => {
  const values = value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
  return [...new Set(values)].slice(0, maximum);
});

export const adminAgentProfileSchema = z.object({
  profileId: z.string().uuid("Selecciona una cuenta válida."),
  slug: z.string().trim().min(2).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Usa minúsculas, números y guiones para el enlace."),
  publicName: z.string().trim().min(2, "El nombre público debe tener al menos 2 caracteres.").max(120),
  biography: z.string().trim().max(2400, "La biografía no puede superar 2400 caracteres."),
  specialties: lines(12),
  serviceAreas: lines(20),
  isPublic: z.enum(["on"]).optional().transform((value) => value === "on"),
});

export type AdminAgentProfileInput = z.infer<typeof adminAgentProfileSchema>;
