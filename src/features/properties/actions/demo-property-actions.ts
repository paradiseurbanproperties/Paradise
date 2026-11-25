"use server";

import { revalidatePath } from "next/cache";
import { requireProfileRole } from "@/lib/permissions/access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AdminPropertyActionState } from "@/features/properties/schemas/admin-property";
import { illustrativePropertyCopy } from "@/features/properties/data/demo-property-copy";

const DEMO_MARKER = "FICHA DE DEMOSTRACIÓN";
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const demoHomes = [
  {
    slug: "demo-casa-patio-de-luz",
    title: "Casa Patio de Luz",
    description: `${DEMO_MARKER}. ${illustrativePropertyCopy["demo-casa-patio-de-luz"]}`,
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
    title: "Casa Juriquilla Encino",
    description: `${DEMO_MARKER}. ${illustrativePropertyCopy["demo-casa-juriquilla-encino"]}`,
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
    title: "Casa Lomas del Parque",
    description: `${DEMO_MARKER}. ${illustrativePropertyCopy["demo-casa-lomas-del-parque"]}`,
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
    title: "Casa Arboleda Chapalita",
    description: `${DEMO_MARKER}. ${illustrativePropertyCopy["demo-casa-chapalita"]}`,
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
    title: "Casa Valle Norte",
    description: `${DEMO_MARKER}. ${illustrativePropertyCopy["demo-casa-valle-norte"]}`,
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
  {
    slug: "demo-casa-fresnos-coyoacan",
    title: "Casa Fresnos de Coyoacán",
    description: `${DEMO_MARKER}. ${illustrativePropertyCopy["demo-casa-fresnos-coyoacan"]}`,
    price: 7_280_000,
    neighborhood: "Del Carmen",
    city: "Ciudad de México",
    state: "Ciudad de México",
    postalCode: "04100",
    latitude: 19.3498,
    longitude: -99.1620,
    bedrooms: 3,
    bathrooms: 2.5,
    parking: 1,
    builtArea: 205,
    landArea: 260,
    features: ["Patio arbolado", "Estudio", "Cocina integral", "Biblioteca"],
    photo: "photo-1600210492486-724fe5c67fb0",
  },
  {
    slug: "demo-casa-valle-real-zapopan",
    title: "Casa Vistahermosa Valle Real",
    description: `${DEMO_MARKER}. ${illustrativePropertyCopy["demo-casa-valle-real-zapopan"]}`,
    price: 11_400_000,
    neighborhood: "Valle Real",
    city: "Zapopan",
    state: "Jalisco",
    postalCode: "45136",
    latitude: 20.7420,
    longitude: -103.4335,
    bedrooms: 4,
    bathrooms: 4.5,
    parking: 3,
    builtArea: 330,
    landArea: 380,
    features: ["Jardín", "Terraza", "Estudio independiente", "Cocina abierta"],
    photo: "photo-1600566753190-17f0baa2a6c3",
  },
  {
    slug: "demo-casa-roble-temozon",
    title: "Casa Roble de Temozón",
    description: `${DEMO_MARKER}. ${illustrativePropertyCopy["demo-casa-roble-temozon"]}`,
    price: 5_920_000,
    neighborhood: "Temozón Norte",
    city: "Mérida",
    state: "Yucatán",
    postalCode: "97302",
    latitude: 21.0547,
    longitude: -89.6280,
    bedrooms: 3,
    bathrooms: 3,
    parking: 2,
    builtArea: 220,
    landArea: 310,
    features: ["Terraza sombreada", "Jardín", "Alberca", "Cocina integral"],
    photo: "photo-1600047509782-20d39509f26d",
  },
  {
    slug: "demo-casa-mar-de-cortes",
    title: "Casa Mar de Cortés",
    description: `${DEMO_MARKER}. ${illustrativePropertyCopy["demo-casa-mar-de-cortes"]}`,
    price: 7_150_000,
    neighborhood: "Playas de Tijuana",
    city: "Tijuana",
    state: "Baja California",
    postalCode: "22504",
    latitude: 32.5294,
    longitude: -117.1150,
    bedrooms: 3,
    bathrooms: 2.5,
    parking: 2,
    builtArea: 215,
    landArea: 290,
    features: ["Terraza", "Patio", "Estudio", "Vista abierta"],
    photo: "photo-1600047509807-ba8f99d2cdde",
  },
  {
    slug: "demo-casa-bosque-niebla",
    title: "Casa Bosque de Niebla",
    description: `${DEMO_MARKER}. ${illustrativePropertyCopy["demo-casa-bosque-niebla"]}`,
    price: 4_780_000,
    neighborhood: "La Garita",
    city: "San Cristóbal de las Casas",
    state: "Chiapas",
    postalCode: "29230",
    latitude: 16.7370,
    longitude: -92.6390,
    bedrooms: 3,
    bathrooms: 2,
    parking: 2,
    builtArea: 190,
    landArea: 360,
    features: ["Chimenea", "Ventanas amplias", "Patio", "Estudio"],
    photo: "photo-1600566752355-35792bedcfea",
  },
  {
    slug: "demo-casa-arboledas-calera",
    title: "Casa Arboledas de La Calera",
    description: `${DEMO_MARKER}. ${illustrativePropertyCopy["demo-casa-arboledas-calera"]}`,
    price: 5_360_000,
    neighborhood: "La Calera",
    city: "Puebla",
    state: "Puebla",
    postalCode: "72560",
    latitude: 19.0140,
    longitude: -98.1940,
    bedrooms: 3,
    bathrooms: 2.5,
    parking: 2,
    builtArea: 205,
    landArea: 300,
    features: ["Terraza", "Jardín", "Área de lavado", "Cochera techada"],
    photo: "photo-1600585154526-990dced4db0d",
  },
  {
    slug: "demo-casa-cumbres-monterrey",
    title: "Casa Cumbres del Norte",
    description: `${DEMO_MARKER}. ${illustrativePropertyCopy["demo-casa-cumbres-monterrey"]}`,
    price: 8_420_000,
    neighborhood: "Cumbres 2.º Sector",
    city: "Monterrey",
    state: "Nuevo León",
    postalCode: "64610",
    latitude: 25.7300,
    longitude: -100.3650,
    bedrooms: 4,
    bathrooms: 3.5,
    parking: 2,
    builtArea: 285,
    landArea: 350,
    features: ["Sala familiar", "Jardín", "Cocina integral", "Terraza"],
    photo: "photo-1600573472591-ee6b68d14c68",
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

      const { error: refreshError } = await supabase.from("properties").update({
        title: home.title,
        description: home.description,
      }).eq("id", existing.id);
      if (refreshError) throw new Error("demo_copy_refresh_failed");

      const { error: imageAltError } = await supabase.from("property_images")
        .update({ alt_text: `Fotografía ilustrativa de una casa en ${home.neighborhood}` })
        .eq("property_id", existing.id);
      if (imageAltError) throw new Error("demo_photo_copy_refresh_failed");
    }

    const pendingHomes = demoHomes.filter((home) => !existingBySlug.has(home.slug));
    skippedCount = demoHomes.length - pendingHomes.length;
    if (!pendingHomes.length) {
      revalidatePath("/");
      revalidatePath("/propiedades");
      revalidatePath("/propiedades/mapa");
      revalidatePath("/admin/propiedades");
      return { status: "success", message: "El catálogo está actualizado; no se crearon duplicados." };
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
        address: `Domicilio de referencia en ${home.neighborhood}; no usar para visitas.`,
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
        alt_text: `Fotografía ilustrativa de una casa en ${home.neighborhood}`,
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
      message: `Se actualizaron o publicaron ${createdCount} propiedades con fotografías y mapa${skippedCount ? `; ${skippedCount} ya existían` : ""}.`,
    };
  } catch (error) {
    if (uploadedPaths.length) await supabase.storage.from("property-images").remove(uploadedPaths);
    if (createdPropertyIds.length) await supabase.from("properties").delete().in("id", createdPropertyIds);
    const code = error instanceof Error ? error.message : "unknown";
    console.error("[properties] No se pudieron publicar las fichas de demostración", { code });
    return {
      status: "error",
      message: "No se pudieron actualizar las propiedades. Se intentó revertir lo creado; revisa el bucket de fotos y vuelve a intentarlo.",
    };
  }
}
