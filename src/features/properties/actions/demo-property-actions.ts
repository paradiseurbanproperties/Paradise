"use server";

import { revalidatePath } from "next/cache";
import { requireProfileRole } from "@/lib/permissions/access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AdminPropertyActionState } from "@/features/properties/schemas/admin-property";

const DEMO_MARKER = "FICHA DE DEMOSTRACIÓN";
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const demoHomes = [
  {
    slug: "demo-casa-patio-de-luz",
    title: "Demo · Casa Patio de Luz",
    description: `${DEMO_MARKER}. Esta casa, su ubicación, precio, características y fotografía son ficticios; no constituye una oferta inmobiliaria real. Residencia ilustrativa con patio, espacios sociales abiertos y acabados de tonos naturales.`,
    price: 8_950_000,
    neighborhood: "Del Valle",
    city: "Ciudad de México",
    state: "Ciudad de México",
    postalCode: "03100",
    latitude: 19.3867,
    longitude: -99.1700,
    bedrooms: 3,
    bathrooms: 2.5,
    parking: 2,
    builtArea: 225,
    landArea: 280,
    features: ["Patio interior", "Cocina integral", "Terraza", "Luz natural"],
    photo: "photo-1600607687939-ce8a6c25118c",
  },
  {
    slug: "demo-casa-juriquilla-encino",
    title: "Demo · Casa Juriquilla Encino",
    description: `${DEMO_MARKER}. Los datos y la fotografía son ilustrativos, no corresponden a un inmueble disponible ni a una oferta real. Casa ficticia de diseño contemporáneo con jardín, estancia amplia y área de trabajo.`,
    price: 6_850_000,
    neighborhood: "Juriquilla",
    city: "Querétaro",
    state: "Querétaro",
    postalCode: "76230",
    latitude: 20.7067,
    longitude: -100.4468,
    bedrooms: 3,
    bathrooms: 2.5,
    parking: 2,
    builtArea: 210,
    landArea: 270,
    features: ["Jardín", "Estudio", "Cocina abierta", "Acceso controlado"],
    photo: "photo-1600596542815-ffad4c1539a9",
  },
  {
    slug: "demo-casa-lomas-del-parque",
    title: "Demo · Casa Lomas del Parque",
    description: `${DEMO_MARKER}. Publicación enteramente ficticia: precio, ubicación, superficies y fotografía se muestran únicamente para probar Paradise. Casa ilustrativa con terraza, jardín y espacios para convivir.`,
    price: 7_450_000,
    neighborhood: "Lomas de Angelópolis",
    city: "Puebla",
    state: "Puebla",
    postalCode: "72830",
    latitude: 18.9956,
    longitude: -98.2467,
    bedrooms: 4,
    bathrooms: 3.5,
    parking: 2,
    builtArea: 260,
    landArea: 310,
    features: ["Jardín", "Terraza", "Cuarto de lavado", "Sala familiar"],
    photo: "photo-1600607687920-4e2a09cf159d",
  },
  {
    slug: "demo-casa-chapalita",
    title: "Demo · Casa Arboleda Chapalita",
    description: `${DEMO_MARKER}. Anuncio, precio, colonia, características y fotografía ficticios, sin relación con una propiedad en venta. Ejemplo residencial con patio arbolado, cocina abierta y espacios iluminados.`,
    price: 9_250_000,
    neighborhood: "Chapalita",
    city: "Guadalajara",
    state: "Jalisco",
    postalCode: "45040",
    latitude: 20.6597,
    longitude: -103.3920,
    bedrooms: 3,
    bathrooms: 3,
    parking: 2,
    builtArea: 245,
    landArea: 330,
    features: ["Patio arbolado", "Cocina integral", "Estudio", "Cochera"],
    photo: "photo-1600566753086-00f18fb6b3ea",
  },
  {
    slug: "demo-casa-valle-norte",
    title: "Demo · Casa Valle Norte",
    description: `${DEMO_MARKER}. Inmueble, precio, ubicación, amenidades y fotografía de muestra; no es una oferta comercial. Residencia ficticia con terraza, sala de TV y jardín para ilustrar el catálogo y mapa.`,
    price: 15_800_000,
    neighborhood: "Del Valle",
    city: "San Pedro Garza García",
    state: "Nuevo León",
    postalCode: "66220",
    latitude: 25.6540,
    longitude: -100.4020,
    bedrooms: 4,
    bathrooms: 4.5,
    parking: 3,
    builtArea: 390,
    landArea: 480,
    features: ["Jardín", "Terraza", "Sala de TV", "Cuarto de servicio"],
    photo: "photo-1600585154340-be6161a56a0c",
  },
] as const;

async function downloadDemoPhoto(photoId: string) {
  const url = `https://images.unsplash.com/${photoId}?fit=crop&w=1440&q=82&fm=jpg`;
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error("demo_photo_unavailable");
  const mimeType = response.headers.get("content-type")?.split(";")[0];
  if (mimeType !== "image/jpeg") throw new Error("demo_photo_format_invalid");
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_IMAGE_BYTES) throw new Error("demo_photo_size_invalid");
  return bytes;
}

async function saveFeatures(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  homes: Array<{ propertyId: string; features: readonly string[] }>,
) {
  const featuresByKey = new Map<string, { label: string; feature_key: string }>();
  for (const home of homes) {
    for (const label of home.features) {
      const feature_key = label.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
        .replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 60);
      featuresByKey.set(feature_key, { label, feature_key });
    }
  }
  const features = [...featuresByKey.values()];
  const { error: upsertError } = await supabase.from("property_features").upsert(features, {
    onConflict: "feature_key",
    ignoreDuplicates: true,
  });
  if (upsertError) throw new Error("demo_features_unavailable");

  const { data, error } = await supabase.from("property_features")
    .select("id, feature_key")
    .in("feature_key", features.map((feature) => feature.feature_key));
  if (error || data?.length !== features.length) throw new Error("demo_features_unavailable");

  const idByKey = new Map(data.map((feature) => [feature.feature_key, feature.id]));
  const values = homes.flatMap((home) => home.features.map((label) => {
    const key = label.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
      .replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 60);
    return { property_id: home.propertyId, feature_id: idByKey.get(key) };
  }));
  if (values.some((value) => !value.feature_id)) throw new Error("demo_features_unavailable");
  const { error: valuesError } = await supabase.from("property_feature_values").insert(values as Array<{ property_id: string; feature_id: string }>);
  if (valuesError) throw new Error("demo_features_unavailable");
}

export async function publishDemoPropertiesAction(
  _previousState: AdminPropertyActionState,
  _formData: FormData,
): Promise<AdminPropertyActionState> {
  void _previousState;
  void _formData;
  const admin = await requireProfileRole(["admin"]);
  const supabase = await createSupabaseServerClient();
  const createdPropertyIds: string[] = [];
  const uploadedPaths: string[] = [];
  let skippedCount = 0;

  try {
    const { data: existingRows, error: existingError } = await supabase.from("properties")
      .select("id, slug, description, publication_status, featured")
      .in("slug", demoHomes.map((home) => home.slug));
    if (existingError) throw new Error("demo_existing_check_failed");

    const existingBySlug = new Map((existingRows ?? []).map((property) => [property.slug, property]));
    for (const home of demoHomes) {
      const existing = existingBySlug.get(home.slug);
      if (!existing) continue;
      if (!existing.description.startsWith(DEMO_MARKER)) throw new Error("demo_slug_conflict");
      if (existing.publication_status !== "approved" || !existing.featured) throw new Error("demo_partial_seed");
    }

    const pendingHomes = demoHomes.filter((home) => !existingBySlug.has(home.slug));
    skippedCount = demoHomes.length - pendingHomes.length;
    if (!pendingHomes.length) {
      return { status: "success", message: "Las cinco fichas de demostración ya están publicadas; no se crearon duplicados." };
    }

    const photos = await Promise.all(pendingHomes.map(async (home) => [home.slug, await downloadDemoPhoto(home.photo)] as const));
    const photoBySlug = new Map(photos);

    const { data: properties, error: propertyError } = await supabase.from("properties").insert(pendingHomes.map((home) => ({
        slug: home.slug,
        title: home.title,
        description: home.description,
        property_type: "house",
        price: home.price,
        currency: "MXN",
        bedrooms: home.bedrooms,
        bathrooms: home.bathrooms,
        parking: home.parking,
        built_area: home.builtArea,
        land_area: home.landArea,
        neighborhood: home.neighborhood,
        city: home.city,
        state: home.state,
        status: "available",
        visibility: "public",
        publication_status: "draft",
        featured: true,
      }))).select("id, slug");
    if (propertyError || !properties || properties.length !== pendingHomes.length) throw new Error("demo_property_insert_failed");
    createdPropertyIds.push(...properties.map((property) => property.id));

    const propertyBySlug = new Map(properties.map((property) => [property.slug, property.id]));
    const propertyHomes = pendingHomes.flatMap((home) => {
      const propertyId = propertyBySlug.get(home.slug);
      return propertyId ? [{ home, propertyId }] : [];
    });
    if (propertyHomes.length !== pendingHomes.length) throw new Error("demo_property_insert_failed");

    const { error: privateDetailsError } = await supabase.from("property_private_details").insert(propertyHomes.map(({ home, propertyId }) => ({
        property_id: propertyId,
        address: `Dirección ficticia de demostración en ${home.neighborhood}; no corresponde a un domicilio real.`,
        postal_code: home.postalCode,
        exact_latitude: home.latitude,
        exact_longitude: home.longitude,
        created_by: admin.userId,
      })));
    if (privateDetailsError) throw new Error("demo_private_details_insert_failed");

    const imageRecords = propertyHomes.map(({ home, propertyId }) => {
      const bytes = photoBySlug.get(home.slug);
      if (!bytes) throw new Error("demo_photo_missing");
      const storagePath = `${propertyId}/${crypto.randomUUID()}.jpg`;
      return { home, propertyId, bytes, storagePath };
    });
    uploadedPaths.push(...imageRecords.map((image) => image.storagePath));
    await Promise.all(imageRecords.map(async ({ bytes, storagePath }) => {
      const { error } = await supabase.storage.from("property-images").upload(storagePath, bytes, {
        contentType: "image/jpeg",
        cacheControl: "3600",
        upsert: false,
      });
      if (error) throw new Error("demo_photo_upload_failed");
    }));

    const { error: imageRowError } = await supabase.from("property_images").insert(imageRecords.map(({ home, propertyId, bytes, storagePath }) => ({
        property_id: propertyId,
        storage_path: storagePath,
        alt_text: `Fotografía ilustrativa de una casa ficticia en ${home.neighborhood}`,
        sort_order: 0,
        is_cover: true,
        mime_type: "image/jpeg",
        size_bytes: bytes.byteLength,
        uploaded_by: admin.userId,
      })));
    if (imageRowError) throw new Error("demo_photo_record_failed");

    await saveFeatures(supabase, propertyHomes.map(({ home, propertyId }) => ({ propertyId, features: home.features })));
    const propertyIds = propertyHomes.map(({ propertyId }) => propertyId);
    const { error: approvalError } = await supabase.from("property_private_details")
      .update({ approved_by: admin.userId })
      .in("property_id", propertyIds);
    if (approvalError) throw new Error("demo_approval_failed");

    const { error: publishError } = await supabase.from("properties").update({
        publication_status: "approved",
        published_at: new Date().toISOString(),
      }).in("id", propertyIds);
    if (publishError) throw new Error("demo_publish_failed");

    revalidatePath("/");
    revalidatePath("/propiedades");
    revalidatePath("/propiedades/mapa");
    revalidatePath("/admin/propiedades");
    for (const home of pendingHomes) revalidatePath(`/propiedad/${home.slug}`);

    const createdCount = pendingHomes.length;
    return {
      status: "success",
      message: `Se publicaron ${createdCount} fichas ficticias con fotografías y mapa${skippedCount ? `; ${skippedCount} ya existían` : ""}.`,
    };
  } catch (error) {
    if (uploadedPaths.length) await supabase.storage.from("property-images").remove(uploadedPaths);
    if (createdPropertyIds.length) await supabase.from("properties").delete().in("id", createdPropertyIds);
    const code = error instanceof Error ? error.message : "unknown";
    console.error("[properties] No se pudieron publicar las fichas de demostración", { code });
    return {
      status: "error",
      message: "No se pudieron publicar las cinco fichas. Se intentó revertir lo creado; revisa el bucket de fotos y vuelve a intentarlo.",
    };
  }
}
