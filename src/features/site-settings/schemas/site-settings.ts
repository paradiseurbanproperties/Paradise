import { z } from "zod";

const optionalEmail = z.string().trim().max(254).refine(
  (value) => value === "" || z.email().safeParse(value).success,
  "Escribe un correo válido o deja el campo vacío.",
);

export const siteSettingsSchema = z.object({
  siteName: z.string().trim().min(1, "El nombre del sitio es obligatorio.").max(100),
  tagline: z.string().trim().max(180),
  seoDescription: z.string().trim().max(300),
  publicEmail: optionalEmail,
  publicPhone: z.string().trim().max(40),
});

export type SiteSettings = z.infer<typeof siteSettingsSchema>;

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  siteName: "Paradise",
  tagline: "Espacios para vivir lo que viene.",
  seoDescription: "Explora propiedades publicadas y encuentra tu próximo hogar con acompañamiento inmobiliario en Paradise.",
  publicEmail: "",
  publicPhone: "",
};
