"use server";

import { revalidatePath } from "next/cache";
import { requireProfileRole } from "@/lib/permissions/access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { favoriteActionSchema } from "@/features/favorites/schemas/favorite";
import { recordCustomerActivity } from "@/features/activity/services/customer-activity";

export type FavoriteActionState = {
  status: "idle" | "error" | "success";
  message: string;
  isFavorite: boolean;
};

export async function setFavoriteAction(
  previousState: FavoriteActionState,
  formData: FormData,
): Promise<FavoriteActionState> {
  const access = await requireProfileRole(["client"]);
  const parsed = favoriteActionSchema.safeParse({
    propertyId: formData.get("propertyId"),
    intent: formData.get("intent"),
  });
  if (!parsed.success) return { status: "error", message: "No se pudo actualizar el favorito.", isFavorite: previousState.isFavorite };

  const supabase = await createSupabaseServerClient();
  if (parsed.data.intent === "add") {
    const { error } = await supabase.from("favorites").insert({
      user_id: access.userId,
      property_id: parsed.data.propertyId,
    });
    if (error && error.code !== "23505") {
      const missingSchema = error.code === "PGRST205" || error.code === "42P01";
      return {
        status: "error",
        message: missingSchema ? "Aplica la migración 0014 para guardar favoritos." : "No se pudo guardar este favorito. La propiedad quizá ya no esté disponible.",
        isFavorite: previousState.isFavorite,
      };
    }
    if (!error) await recordCustomerActivity("favorite_added", parsed.data.propertyId);
  } else {
    const { data, error } = await supabase.from("favorites")
      .delete()
      .eq("user_id", access.userId)
      .eq("property_id", parsed.data.propertyId)
      .select("property_id");
    if (error) return { status: "error", message: "No se pudo quitar este favorito.", isFavorite: previousState.isFavorite };
    if (data?.length) await recordCustomerActivity("favorite_removed", parsed.data.propertyId);
  }

  const isFavorite = parsed.data.intent === "add";
  revalidatePath("/favoritos");
  revalidatePath("/mi-actividad");
  return { status: "success", message: isFavorite ? "Guardada en tus favoritos." : "Quitada de tus favoritos.", isFavorite };
}
