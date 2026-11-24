import { z } from "zod";

export const favoriteActionSchema = z.object({
  propertyId: z.string().uuid("La propiedad no es válida."),
  intent: z.enum(["add", "remove"]),
});
