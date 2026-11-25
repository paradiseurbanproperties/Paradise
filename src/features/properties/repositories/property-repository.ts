import { demoProperties } from "@/features/properties/data/demo-properties";
import type { Property } from "@/features/properties/types/property";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createPropertyImageUrlMap } from "@/features/properties/services/property-images";

const propertyTypeLabels: Record<string, Property["type"]> = {
  house: "Casa",
  apartment: "Departamento",
  land: "Terreno",
  country_house: "Casa de campo",
};

const placeholderImage = {
  src: "/images/property-placeholder.svg",
  alt: "Propiedad sin fotografía disponible",
};

type PropertyCatalogRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  property_type: string;
  price: number | string;
  currency: string;
  status: Property["status"];
  visibility: Property["visibility"];
  neighborhood: string | null;
  city: string;
  state: string;
  latitude: number | null;
  longitude: number | null;
  bedrooms: number;
  bathrooms: number | string;
  parking: number;
  built_area: number | string;
  land_area: number | string;
  featured: boolean;
  published_at: string | null;
  property_images: Array<{
    id: string;
    storage_path: string;
    alt_text: string | null;
    sort_order: number;
    is_cover: boolean;
  }>;
  property_feature_values: Array<{
    value: string | null;
    property_features: { label: string } | { label: string }[] | null;
  }>;
};

const catalogSelection = `
  id, slug, title, description, property_type, price, currency, status,
  visibility, neighborhood, city, state, latitude, longitude, bedrooms, bathrooms, parking,
  built_area, land_area, featured, published_at,
  property_images (id, storage_path, alt_text, sort_order, is_cover),
  property_feature_values (value, property_features (label))
`;

function summarize(description: string): string {
  const clean = description.trim().replace(/\s+/g, " ");
  return clean.length > 150 ? `${clean.slice(0, 147).trimEnd()}…` : clean;
}

async function mapPropertyRows(rows: PropertyCatalogRow[]): Promise<Property[]> {
  const paths = rows.flatMap((row) => row.property_images.map((image) => image.storage_path));
  const signedUrls = paths.length ? await createPropertyImageUrlMap(paths) : new Map<string, string>();

  return rows.map((row) => {
    const images = [...row.property_images]
      .sort((a, b) => Number(b.is_cover) - Number(a.is_cover) || a.sort_order - b.sort_order)
      .flatMap((image) => {
        const src = signedUrls.get(image.storage_path);
        return src ? [{ src, alt: image.alt_text || row.title }] : [];
      });
    const features = row.property_feature_values.flatMap((featureValue) => {
      const feature = Array.isArray(featureValue.property_features)
        ? featureValue.property_features[0]
        : featureValue.property_features;
      return feature?.label ? [feature.label] : [];
    });

    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      summary: summarize(row.description),
      description: row.description,
      type: propertyTypeLabels[row.property_type] ?? "Casa",
      price: Number(row.price),
      currency: "MXN",
      status: row.status,
      visibility: row.visibility,
      location: {
        neighborhood: row.neighborhood ?? "",
        city: row.city,
        state: row.state,
        latitude: row.latitude,
        longitude: row.longitude,
      },
      bedrooms: row.bedrooms,
      bathrooms: Number(row.bathrooms),
      parking: row.parking,
      builtArea: Number(row.built_area),
      landArea: Number(row.land_area),
      features,
      images: images.length ? images : [placeholderImage],
      featured: row.featured,
      demo: row.description.startsWith("FICHA DE DEMOSTRACIÓN"),
    } satisfies Property;
  });
}

/** Lee únicamente el inventario autorizado por RLS; los ejemplos solo se usan sin Supabase. */
export async function listPublicProperties(): Promise<Property[]> {
  if (!getSupabasePublicConfig()) {
    return demoProperties.filter((property) => property.visibility !== "premium");
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("properties")
    .select(catalogSelection)
    .eq("publication_status", "approved")
    .in("visibility", ["public", "premium", "both"])
    .order("published_at", { ascending: false })
    .limit(60);

  if (error) {
    console.error("[properties] No se pudo cargar el catálogo", { code: error.code });
    return [];
  }

  return mapPropertyRows((data ?? []) as unknown as PropertyCatalogRow[]);
}

export async function listPublicPropertySitemapEntries(): Promise<Array<{ slug: string; updatedAt: string }>> {
  if (!getSupabasePublicConfig()) return [];
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("properties")
    .select("slug,updated_at,description")
    .eq("publication_status", "approved")
    .in("visibility", ["public", "both"])
    .order("updated_at", { ascending: false })
    .limit(5000);
  if (error) {
    console.error("[properties] No se pudieron cargar URLs públicas para sitemap", { code: error.code });
    return [];
  }
  return (data ?? [])
    .filter((row) => !row.description.startsWith("FICHA DE DEMOSTRACIÓN"))
    .map((row) => ({ slug: row.slug, updatedAt: row.updated_at }));
}

export async function listPublicPropertiesNearby({
  latitude,
  longitude,
  radiusMeters,
}: {
  latitude: number;
  longitude: number;
  radiusMeters: number;
}): Promise<{ properties: Property[]; status: "ok" | "unavailable" | "not_configured" }> {
  if (!getSupabasePublicConfig()) return { properties: [], status: "not_configured" };

  const supabase = await createSupabaseServerClient();
  const { data: nearby, error: nearbyError } = await supabase.rpc("search_public_properties_nearby", {
    center_latitude: latitude,
    center_longitude: longitude,
    radius_meters: radiusMeters,
    result_limit: 100,
  });
  if (nearbyError) {
    console.error("[properties] No se pudo buscar por proximidad", { code: nearbyError.code });
    return { properties: [], status: "unavailable" };
  }

  const ids: string[] = ((nearby ?? []) as Array<{ id: string }>).map((row) => row.id);
  if (!ids.length) return { properties: [], status: "ok" };

  const { data, error } = await supabase
    .from("properties")
    .select(catalogSelection)
    .in("id", ids)
    .eq("publication_status", "approved")
    .in("visibility", ["public", "premium", "both"]);
  if (error) {
    console.error("[properties] No se pudieron cargar resultados cercanos", { code: error.code });
    return { properties: [], status: "unavailable" };
  }

  const byId = new Map(((data ?? []) as unknown as PropertyCatalogRow[]).map((row) => [row.id, row]));
  const orderedRows = ids.flatMap((id) => {
    const row = byId.get(id);
    return row ? [row] : [];
  });
  return { properties: await mapPropertyRows(orderedRows), status: "ok" };
}

export async function findPublicPropertyBySlug(slug: string): Promise<Property | undefined> {
  return (await listPublicProperties()).find((property) => property.slug === slug);
}

export type PublicPriceHistoryEntry = {
  previousPrice: number;
  newPrice: number;
  currency: "MXN";
  changedAt: string;
};

export async function listPublicPropertyPriceHistory(propertyId: string): Promise<PublicPriceHistoryEntry[]> {
  if (!getSupabasePublicConfig()) return [];
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("property_price_history")
    .select("previous_price, new_price, currency, changed_at")
    .eq("property_id", propertyId)
    .order("changed_at", { ascending: false })
    .limit(20);
  if (error) {
    console.error("[properties] No se pudo cargar el historial de precios", { code: error.code });
    return [];
  }
  return (data ?? []).map((entry) => ({
    previousPrice: Number(entry.previous_price),
    newPrice: Number(entry.new_price),
    currency: "MXN",
    changedAt: entry.changed_at,
  }));
}
