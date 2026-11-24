"use server";

import { revalidatePath } from "next/cache";
import { requireProfileRole } from "@/lib/permissions/access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  createPropertySchema,
  registerPropertyImageSchema,
  updatePropertyDetailsSchema,
  updatePropertyPublicationSchema,
  type AdminPropertyActionState,
} from "@/features/properties/schemas/admin-property";

function createSlug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90);
}

function revalidatePropertyRoutes(slug?: string) {
  revalidatePath("/");
  revalidatePath("/propiedades");
  revalidatePath("/admin/propiedades");
  if (slug) revalidatePath(`/propiedad/${slug}`);
}

function featureKey(label: string): string {
  return label.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 60);
}

async function savePropertyFeatures(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, propertyId: string, labels: string[]) {
  const unique = new Map<string, { feature_key: string; label: string }>();
  for (const label of labels) {
    const key = featureKey(label);
    if (key && !unique.has(key)) unique.set(key, { feature_key: key, label });
  }
  const usable = [...unique.values()];
  if (!usable.length) {
    const { error } = await supabase.from("property_feature_values").delete().eq("property_id", propertyId);
    return !error;
  }
  if (usable.length) {
    const { error: upsertError } = await supabase.from("property_features").upsert(usable, {
      onConflict: "feature_key",
      ignoreDuplicates: true,
    });
    if (upsertError) return false;
  }
  const { data: features, error: featureError } = await supabase
    .from("property_features")
    .select("id, feature_key")
    .in("feature_key", usable.map((feature) => feature.feature_key));
  if (featureError) return false;

  const { error: clearError } = await supabase
    .from("property_feature_values")
    .delete()
    .eq("property_id", propertyId);
  if (clearError) return false;
  if (features?.length) {
    const { error: insertError } = await supabase.from("property_feature_values").insert(
      features.map((feature) => ({ property_id: propertyId, feature_id: feature.id })),
    );
    if (insertError) return false;
  }
  return true;
}

export async function createAdminPropertyAction(
  _previousState: AdminPropertyActionState,
  formData: FormData,
): Promise<AdminPropertyActionState> {
  const admin = await requireProfileRole(["admin"]);
  const parsed = createPropertySchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    features: formData.get("features"),
    propertyType: formData.get("propertyType"),
    price: formData.get("price"),
    bedrooms: formData.get("bedrooms"),
    bathrooms: formData.get("bathrooms"),
    parking: formData.get("parking"),
    builtArea: formData.get("builtArea"),
    landArea: formData.get("landArea"),
    address: formData.get("address"),
    neighborhood: formData.get("neighborhood"),
    city: formData.get("city"),
    state: formData.get("state"),
    postalCode: formData.get("postalCode"),
    status: formData.get("status"),
    visibility: formData.get("visibility"),
    latitude: formData.get("latitude"),
    longitude: formData.get("longitude"),
  });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Revisa los datos de la propiedad." };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("properties")
    .insert({
      slug: createSlug(parsed.data.title),
      title: parsed.data.title,
      description: parsed.data.description,
      property_type: parsed.data.propertyType,
      price: parsed.data.price,
      bedrooms: parsed.data.bedrooms,
      bathrooms: parsed.data.bathrooms,
      parking: parsed.data.parking,
      built_area: parsed.data.builtArea,
      land_area: parsed.data.landArea,
      neighborhood: parsed.data.neighborhood,
      city: parsed.data.city,
      state: parsed.data.state,
      status: parsed.data.status,
      visibility: parsed.data.visibility,
      publication_status: "draft",
      featured: false,
    })
    .select("id, slug")
    .single();

  if (error || !data) {
    const duplicate = error?.code === "23505";
    return {
      status: "error",
      message: duplicate
        ? "Ya existe una propiedad con ese nombre. Cambia el nombre para crear una URL distinta."
        : "No se pudo guardar la propiedad. Revisa la conexión y vuelve a intentarlo.",
    };
  }

  const { error: privateDetailsError } = await supabase.from("property_private_details").insert({
    property_id: data.id,
    address: parsed.data.address,
    postal_code: parsed.data.postalCode,
    exact_latitude: parsed.data.latitude,
    exact_longitude: parsed.data.longitude,
    created_by: admin.userId,
  });
  if (privateDetailsError) {
    await supabase.from("properties").delete().eq("id", data.id);
    return { status: "error", message: "No se pudo guardar la dirección privada. La propiedad no se conservó." };
  }

  const featuresSaved = await savePropertyFeatures(supabase, data.id, parsed.data.features);

  revalidatePropertyRoutes(data.slug);
  return {
    status: featuresSaved ? "success" : "error",
    message: featuresSaved
      ? "Propiedad guardada como borrador. Ya puedes cargar sus fotografías."
      : "La ficha se guardó, pero no se pudieron guardar sus características. Edita la ficha para reintentarlo.",
    propertyId: data.id,
  };
}

export async function updateAdminPropertyPublicationAction(
  _previousState: AdminPropertyActionState,
  formData: FormData,
): Promise<AdminPropertyActionState> {
  const admin = await requireProfileRole(["admin"]);
  const parsed = updatePropertyPublicationSchema.safeParse({
    propertyId: formData.get("propertyId"),
    status: formData.get("status"),
    visibility: formData.get("visibility"),
    publicationStatus: formData.get("publicationStatus"),
    featured: formData.get("featured"),
  });
  if (!parsed.success) return { status: "error", message: "Revisa los datos de publicación." };

  const supabase = await createSupabaseServerClient();
  const { data: current, error: currentError } = await supabase
    .from("properties")
    .select("slug")
    .eq("id", parsed.data.propertyId)
    .maybeSingle();
  if (currentError || !current) return { status: "error", message: "No se encontró la propiedad." };

  if (parsed.data.publicationStatus === "approved") {
    const { data: cover, error: coverError } = await supabase
      .from("property_images")
      .select("id")
      .eq("property_id", parsed.data.propertyId)
      .eq("is_cover", true)
      .maybeSingle();
    if (coverError || !cover) return { status: "error", message: "Carga una fotografía principal antes de aprobar esta propiedad." };
  }

  const { error: privateDetailsError } = await supabase.from("property_private_details")
    .update({ approved_by: parsed.data.publicationStatus === "approved" ? admin.userId : null })
    .eq("property_id", parsed.data.propertyId);
  if (privateDetailsError) return { status: "error", message: "No se pudo guardar la autoría de publicación." };

  const { error } = await supabase
    .from("properties")
    .update({
      status: parsed.data.status,
      visibility: parsed.data.visibility,
      publication_status: parsed.data.publicationStatus,
      featured: parsed.data.featured,
      published_at: parsed.data.publicationStatus === "approved" ? new Date().toISOString() : null,
    })
    .eq("id", parsed.data.propertyId);

  if (error) return { status: "error", message: "No se pudo actualizar la publicación." };
  revalidatePropertyRoutes(current.slug);
  return { status: "success", message: "Se actualizaron el estado y la publicación." };
}

export async function updateAdminPropertyDetailsAction(
  _previousState: AdminPropertyActionState,
  formData: FormData,
): Promise<AdminPropertyActionState> {
  await requireProfileRole(["admin"]);
  const parsed = updatePropertyDetailsSchema.safeParse({
    propertyId: formData.get("propertyId"),
    title: formData.get("title"),
    description: formData.get("description"),
    features: formData.get("features"),
    propertyType: formData.get("propertyType"),
    price: formData.get("price"),
    bedrooms: formData.get("bedrooms"),
    bathrooms: formData.get("bathrooms"),
    parking: formData.get("parking"),
    builtArea: formData.get("builtArea"),
    landArea: formData.get("landArea"),
    address: formData.get("address"),
    neighborhood: formData.get("neighborhood"),
    city: formData.get("city"),
    state: formData.get("state"),
    postalCode: formData.get("postalCode"),
    status: formData.get("status"),
    visibility: formData.get("visibility"),
    latitude: formData.get("latitude"),
    longitude: formData.get("longitude"),
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Revisa los datos." };

  const supabase = await createSupabaseServerClient();
  const { data: current, error: currentError } = await supabase
    .from("properties")
    .select("slug, price")
    .eq("id", parsed.data.propertyId)
    .maybeSingle();
  if (currentError || !current) return { status: "error", message: "No se encontró la propiedad." };

  if (Number(current.price) !== parsed.data.price) {
    const { error: historyError } = await supabase
      .from("property_price_history")
      .select("id", { count: "exact", head: true });
    if (historyError) {
      return { status: "error", message: "Aplica la migración 0004 del historial de precios antes de cambiar el precio." };
    }
  }

  const { error } = await supabase.from("properties").update({
    slug: createSlug(parsed.data.title),
    title: parsed.data.title,
    description: parsed.data.description,
    property_type: parsed.data.propertyType,
    price: parsed.data.price,
    bedrooms: parsed.data.bedrooms,
    bathrooms: parsed.data.bathrooms,
    parking: parsed.data.parking,
    built_area: parsed.data.builtArea,
    land_area: parsed.data.landArea,
    neighborhood: parsed.data.neighborhood,
    city: parsed.data.city,
    state: parsed.data.state,
    status: parsed.data.status,
    visibility: parsed.data.visibility,
  }).eq("id", parsed.data.propertyId);
  if (error) return { status: "error", message: error.code === "23505" ? "Ese nombre ya genera una URL existente." : "No se pudo actualizar la propiedad." };

  const { error: privateDetailsError } = await supabase.from("property_private_details")
    .update({
      address: parsed.data.address,
      postal_code: parsed.data.postalCode,
      exact_latitude: parsed.data.latitude,
      exact_longitude: parsed.data.longitude,
    })
    .eq("property_id", parsed.data.propertyId);
  if (privateDetailsError) {
    return { status: "error", message: "La ficha se actualizó, pero no se pudieron guardar sus datos privados." };
  }

  const featuresSaved = await savePropertyFeatures(supabase, parsed.data.propertyId, parsed.data.features);

  revalidatePropertyRoutes(current.slug);
  revalidatePropertyRoutes(createSlug(parsed.data.title));
  return featuresSaved
    ? { status: "success", message: "Se actualizaron los datos de la propiedad." }
    : { status: "error", message: "La ficha se actualizó, pero no se pudieron guardar sus características." };
}

export async function registerAdminPropertyImageAction(input: unknown): Promise<AdminPropertyActionState> {
  const admin = await requireProfileRole(["admin"]);
  const parsed = registerPropertyImageSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "La imagen no es válida." };

  const fileName = parsed.data.storagePath.split("/").at(-1) ?? "";
  const safePath = new RegExp(`^${parsed.data.propertyId}/[0-9a-f-]{36}\\.(jpg|jpeg|png|webp|avif)$`, "i");
  if (!safePath.test(parsed.data.storagePath) || !fileName) {
    return { status: "error", message: "La ruta de la fotografía no es válida." };
  }
  const extension = fileName.split(".").at(-1)?.toLowerCase();
  const expectedExtension = {
    "image/jpeg": ["jpg", "jpeg"],
    "image/png": ["png"],
    "image/webp": ["webp"],
    "image/avif": ["avif"],
  }[parsed.data.mimeType];
  if (!extension || !expectedExtension.includes(extension)) {
    return { status: "error", message: "El formato declarado no coincide con la ruta de la fotografía." };
  }

  const supabase = await createSupabaseServerClient();
  const { count, error: countError } = await supabase
    .from("property_images")
    .select("id", { count: "exact", head: true })
    .eq("property_id", parsed.data.propertyId);
  if (countError) return { status: "error", message: "No se pudo verificar el límite de fotografías." };
  if ((count ?? 0) >= 30) return { status: "error", message: "Cada propiedad admite hasta 30 fotografías." };
  const { error } = await supabase.from("property_images").insert({
    property_id: parsed.data.propertyId,
    storage_path: parsed.data.storagePath,
    alt_text: parsed.data.altText,
    sort_order: parsed.data.sortOrder,
    is_cover: parsed.data.isCover,
    mime_type: parsed.data.mimeType,
    size_bytes: parsed.data.sizeBytes,
    uploaded_by: admin.userId,
  });
  if (error) return { status: "error", message: "No se pudo registrar la fotografía en la propiedad." };

  revalidatePropertyRoutes();
  return { status: "success", message: "Fotografía cargada y vinculada a la propiedad." };
}

export async function deleteAdminPropertyImageAction(imageId: string): Promise<AdminPropertyActionState> {
  await requireProfileRole(["admin"]);
  if (!/^[0-9a-f-]{36}$/i.test(imageId)) return { status: "error", message: "Identificador de imagen inválido." };
  const supabase = await createSupabaseServerClient();
  const { data: image, error: imageError } = await supabase
    .from("property_images")
    .select("storage_path, property_id, is_cover")
    .eq("id", imageId)
    .maybeSingle();
  if (imageError || !image) return { status: "error", message: "No se encontró la fotografía." };

  const { error: storageError } = await supabase.storage.from("property-images").remove([image.storage_path]);
  if (storageError) return { status: "error", message: "No se pudo borrar el archivo de Storage; el registro se conservó." };

  const { error } = await supabase.from("property_images").delete().eq("id", imageId);
  if (error) return { status: "error", message: "Se borró el archivo pero no su registro. Recarga y vuelve a intentar." };
  if (image.is_cover) {
    const { data: nextImage } = await supabase
      .from("property_images")
      .select("id")
      .eq("property_id", image.property_id)
      .order("sort_order", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (nextImage) await supabase.from("property_images").update({ is_cover: true }).eq("id", nextImage.id);
  }
  revalidatePropertyRoutes();
  return { status: "success", message: "Se eliminó la fotografía." };
}

export async function deleteAdminPropertyAction(propertyId: string): Promise<AdminPropertyActionState> {
  await requireProfileRole(["admin"]);
  if (!/^[0-9a-f-]{36}$/i.test(propertyId)) return { status: "error", message: "Identificador inválido." };
  const supabase = await createSupabaseServerClient();
  const { data: images, error: imageError } = await supabase
    .from("property_images")
    .select("storage_path")
    .eq("property_id", propertyId);
  if (imageError) return { status: "error", message: "No se pudieron consultar las fotografías." };

  const paths = (images ?? []).map((image) => image.storage_path);
  if (paths.length) {
    const { error: storageError } = await supabase.storage.from("property-images").remove(paths);
    if (storageError) return { status: "error", message: "No se pudieron eliminar las fotografías; la propiedad se conservó." };
  }

  const { error } = await supabase.from("properties").delete().eq("id", propertyId);
  if (error) return { status: "error", message: "No se pudo eliminar la propiedad." };
  revalidatePropertyRoutes();
  return { status: "success", message: "Se eliminó la propiedad y sus fotografías." };
}
