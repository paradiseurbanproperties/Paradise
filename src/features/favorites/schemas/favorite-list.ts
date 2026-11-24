import { z } from "zod";

export const favoriteListActionSchema = z.discriminatedUnion("intent", [
  z.object({ intent: z.literal("create"), name: z.string().trim().min(1).max(40) }),
  z.object({ intent: z.literal("rename"), listId: z.string().uuid(), name: z.string().trim().min(1).max(40) }),
  z.object({ intent: z.literal("delete"), listId: z.string().uuid() }),
]);

export const favoriteListPropertyActionSchema = z.object({
  listId: z.string().uuid(),
  propertyId: z.string().uuid(),
  intent: z.enum(["add", "remove"]),
});
