import "server-only";

import { getCurrentAccessContext } from "@/lib/permissions/access";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type FavoriteListSummary = { id: string; name: string; createdAt: string; propertyIds: string[] };

export async function listOwnFavoriteLists(): Promise<{ lists: FavoriteListSummary[]; unavailable: boolean }> {
  const access = await getCurrentAccessContext();
  if (!access || access.role !== "client" || access.status !== "active" || !getSupabasePublicConfig()) {
    return { lists: [], unavailable: false };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("favorite_lists")
    .select("id,name,created_at,favorite_list_properties(property_id)")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[favorites] No se pudieron cargar las listas", { code: error.code });
    return { lists: [], unavailable: true };
  }

  return {
    lists: (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      createdAt: row.created_at,
      propertyIds: row.favorite_list_properties.map((item) => item.property_id),
    })),
    unavailable: false,
  };
}

export async function getOwnFavoriteList(listId: string): Promise<{ list: FavoriteListSummary | null; unavailable: boolean }> {
  const access = await getCurrentAccessContext();
  if (!access || access.role !== "client" || access.status !== "active" || !getSupabasePublicConfig()) {
    return { list: null, unavailable: false };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("favorite_lists")
    .select("id,name,created_at,favorite_list_properties(property_id)")
    .eq("id", listId)
    .maybeSingle();
  if (error) {
    console.error("[favorites] No se pudo cargar la lista", { code: error.code });
    return { list: null, unavailable: true };
  }
  if (!data) return { list: null, unavailable: false };

  return {
    list: {
      id: data.id,
      name: data.name,
      createdAt: data.created_at,
      propertyIds: data.favorite_list_properties.map((item) => item.property_id),
    },
    unavailable: false,
  };
}
