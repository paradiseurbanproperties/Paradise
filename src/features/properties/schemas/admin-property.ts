import { z } from "zod";

const propertyTypes = ["house", "apartment", "land", "country_house"] as const;
const propertyStatuses = ["available", "in_deal", "sold"] as const;
const propertyVisibilities = ["public", "premium", "both"] as const;
const publicationStatuses = ["draft", "pending", "approved", "rejected", "archived"] as const;
const MAX_PROPERTY_PRICE = 999_999_999_999.99;

export const createPropertySchema = z.object({
  title: z.string().trim().min(4, "Escribe un nombre de al menos 4 caracteres.").max(120),
  description: z.string().trim().min(30, "La descripción debe tener al menos 30 caracteres.").max(6000),
  features: z.string().trim().max(1600).transform((value) =>
    [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))].slice(0, 20),
  ),
  propertyType: z.enum(propertyTypes),
  price: z.coerce.number().positive("El precio debe ser mayor que cero.").max(MAX_PROPERTY_PRICE, "El precio supera el límite permitido por la base de datos."),
  bedrooms: z.coerce.number().int().min(0).max(30),
  bathrooms: z.coerce.number().min(0).max(30),
  parking: z.coerce.number().int().min(0).max(30),
  builtArea: z.coerce.number().min(0).max(1_000_000),
  landArea: z.coerce.number().min(0).max(1_000_000),
  address: z.string().trim().max(240),
  neighborhood: z.string().trim().max(120),
  city: z.string().trim().min(2).max(120),
  state: z.string().trim().min(2).max(120),
  postalCode: z.string().trim().max(16),
  status: z.enum(propertyStatuses),
  visibility: z.enum(propertyVisibilities),
  latitude: z.preprocess((value) => value === "" || value === null ? null : Number(value), z.number().min(-90).max(90).nullable()),
  longitude: z.preprocess((value) => value === "" || value === null ? null : Number(value), z.number().min(-180).max(180).nullable()),
}).superRefine((value, context) => {
  if ((value.latitude === null) !== (value.longitude === null)) {
    context.addIssue({ code: "custom", message: "Indica latitud y longitud juntas, o deja ambas vacías.", path: ["latitude"] });
  }
});

export const updatePropertyDetailsSchema = createPropertySchema.extend({
  propertyId: z.string().uuid(),
});

export const updatePropertyPublicationSchema = z.object({
  propertyId: z.string().uuid(),
  status: z.enum(propertyStatuses),
  visibility: z.enum(propertyVisibilities),
  publicationStatus: z.enum(publicationStatuses),
  featured: z.enum(["true", "false"]).transform((value) => value === "true"),
});

export const registerPropertyImageSchema = z.object({
  propertyId: z.string().uuid(),
  storagePath: z.string().min(1).max(300),
  altText: z.string().trim().max(240),
  sortOrder: z.number().int().min(0).max(100),
  isCover: z.boolean(),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "image/avif"]),
  sizeBytes: z.number().int().positive().max(10 * 1024 * 1024),
});

export type AdminPropertyActionState = {
  status: "idle" | "error" | "success";
  message: string;
  propertyId?: string;
};

export const EMPTY_ADMIN_PROPERTY_STATE: AdminPropertyActionState = {
  status: "idle",
  message: "",
};
