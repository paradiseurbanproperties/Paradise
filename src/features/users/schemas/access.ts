import { z } from "zod";
import { PROFILE_ROLES } from "@/constants/access";

export const updateAccountAccessSchema = z.object({
  targetUserId: z.string().uuid("El identificador de usuario no es válido."),
  role: z.enum(PROFILE_ROLES),
  status: z.enum(["active", "suspended"]),
});
