"use server";

import { revalidatePath } from "next/cache";
import { requireProfileRole } from "@/lib/permissions/access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { favoriteListActionSchema, favoriteListPropertyActionSchema } from "@/features/favorites/schemas/favorite-list";
import type { FavoriteListActionState } from "@/features/favorites/types/favorite-list";

function invalidState(): FavoriteListActionState {
  return { status: "error", message: "Revisa los datos e intenta de nuevo." };
}

export async function manageFavoriteListAction(
  _previousState: FavoriteListActionState,
  formData: FormData,
): Promise<FavoriteListActionState> {
  const access = await requireProfileRole(["client"]);
  const parsed = favoriteListActionSchema.safeParse({
    intent: formData.get("intent"),
    listId: formData.get("listId"),
    name: formData.get("name"),
  });
  if (!parsed.success) return invalidState();

  const supabase = await createSupabaseServerClient();
  let error;
  if (parsed.data.intent === "create") {
    ({ error } = await supabase.from("favorite_lists").insert({ user_id: access.userId, name: parsed.data.name }));
  } else if (parsed.data.intent === "rename") {
    ({ error } = await supabase.from("favorite_lists").update({ name: parsed.data.name }).eq("id", parsed.data.listId).eq("user_id", access.userId));
  } else {
    ({ error } = await supabase.from("favorite_lists").delete().eq("id", parsed.data.listId).eq("user_id", access.userId));
  }

  if (error) {
    const missingSchema = error.code === "PGRST205" || error.code === "42P01";
    return {
      status: "error",
      message: missingSchema ? "Aplica la migración 0015 para administrar listas." : error.code === "23505" ? "Ya tienes una lista con ese nombre." : "No se pudo guardar el cambio. Intenta de nuevo.",
    };
  }

  revalidatePath("/favoritos");
  revalidatePath("/favoritos/listas");
  return { status: "success", message: parsed.data.intent === "delete" ? "Lista eliminada." : parsed.data.intent === "rename" ? "Nombre actualizado." : "Lista creada." };
}

export async function setFavoriteListPropertyAction(
  _previousState: FavoriteListActionState,
  formData: FormData,
): Promise<FavoriteListActionState> {
  await requireProfileRole(["client"]);
  const parsed = favoriteListPropertyActionSchema.safeParse({
    listId: formData.get("listId"),
    propertyId: formData.get("propertyId"),
    intent: formData.get("intent"),
  });
  if (!parsed.success) return invalidState();

  const supabase = await createSupabaseServerClient();
  if (parsed.data.intent === "add") {
    const { error } = await supabase.from("favorite_list_properties").insert({
      list_id: parsed.data.listId,
      property_id: parsed.data.propertyId,
    });
    if (error && error.code !== "23505") {
      const missingSchema = error.code === "PGRST205" || error.code === "42P01";
      return { status: "error", message: missingSchema ? "Aplica la migración 0015 para usar listas." : "No se pudo agregar la propiedad a esta lista." };
    }
  } else {
    const { error } = await supabase.from("favorite_list_properties").delete()
      .eq("list_id", parsed.data.listId)
      .eq("property_id", parsed.data.propertyId);
    if (error) return { status: "error", message: "No se pudo quitar la propiedad de esta lista." };
  }

  revalidatePath("/favoritos");
  revalidatePath("/favoritos/listas");
  revalidatePath(`/favoritos/listas/${parsed.data.listId}`);
  return { status: "success", message: parsed.data.intent === "add" ? "Propiedad agregada." : "Propiedad retirada de la lista." };
}
