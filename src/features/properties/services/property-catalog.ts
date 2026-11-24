import type {
  Property,
  PropertyFilters,
  PropertyPage,
  PropertySearchParams,
  PropertyStatus,
  PropertyType,
} from "@/features/properties/types/property";

const propertyTypes: PropertyType[] = ["Casa", "Departamento", "Terreno", "Casa de campo"];
const propertyStatuses: PropertyStatus[] = ["available", "in_deal", "sold"];
const PAGE_SIZE = 6;

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function positiveNumber(value: string | string[] | undefined, max: number): number | undefined {
  const raw = firstValue(value).trim();
  if (!raw) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= max ? parsed : undefined;
}

export function parsePropertyFilters(params: PropertySearchParams): PropertyFilters {
  const rawType = firstValue(params.type);
  const rawVisibility = firstValue(params.visibility);
  const rawStatus = firstValue(params.status);
  const rawSort = firstValue(params.sort);
  const rawPage = positiveNumber(params.page, 100_000);

  return {
    query: firstValue(params.q).trim().slice(0, 100),
    type: propertyTypes.includes(rawType as PropertyType) ? (rawType as PropertyType) : "",
    minPrice: positiveNumber(params.minPrice, 1_000_000_000),
    maxPrice: positiveNumber(params.maxPrice, 1_000_000_000),
    bedrooms: positiveNumber(params.bedrooms, 20),
    bathrooms: positiveNumber(params.bathrooms, 20),
    minArea: positiveNumber(params.minArea, 100_000),
    visibility: rawVisibility === "public" || rawVisibility === "both" ? rawVisibility : "",
    status: propertyStatuses.includes(rawStatus as PropertyStatus)
      ? (rawStatus as PropertyStatus)
      : "",
    sort: rawSort === "price-asc" || rawSort === "price-desc" ? rawSort : "featured",
    page: Math.max(1, Math.floor(rawPage ?? 1)),
  };
}

export function filterAndPaginateProperties(
  source: Property[],
  filters: PropertyFilters,
): PropertyPage {
  const normalizeSearch = (value: string) =>
    value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("es-MX");
  const normalizedQuery = normalizeSearch(filters.query);
  const filtered = source.filter((property) => {
    const searchable = [
      property.title,
      property.type,
      property.location.neighborhood,
      property.location.city,
      property.location.state,
      ...property.features,
    ]
      .join(" ");
    const normalizedSearchable = normalizeSearch(searchable);

    return (
      (!normalizedQuery || normalizedSearchable.includes(normalizedQuery)) &&
      (!filters.type || property.type === filters.type) &&
      (filters.minPrice === undefined || property.price >= filters.minPrice) &&
      (filters.maxPrice === undefined || property.price <= filters.maxPrice) &&
      (filters.bedrooms === undefined || property.bedrooms >= filters.bedrooms) &&
      (filters.bathrooms === undefined || property.bathrooms >= filters.bathrooms) &&
      (filters.minArea === undefined || Math.max(property.builtArea, property.landArea) >= filters.minArea) &&
      (!filters.visibility || property.visibility === filters.visibility) &&
      (!filters.status || property.status === filters.status)
    );
  });

  const sorted = [...filtered].sort((first, second) => {
    if (filters.sort === "price-asc") return first.price - second.price;
    if (filters.sort === "price-desc") return second.price - first.price;
    return Number(second.featured) - Number(first.featured) || first.price - second.price;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const page = Math.min(filters.page, totalPages);
  const start = (page - 1) * PAGE_SIZE;

  return {
    items: sorted.slice(start, start + PAGE_SIZE),
    page,
    pageSize: PAGE_SIZE,
    totalItems: sorted.length,
    totalPages,
  };
}

export function propertyFilterHref(filters: PropertyFilters, page: number): string {
  const params = new URLSearchParams();
  if (filters.query) params.set("q", filters.query);
  if (filters.type) params.set("type", filters.type);
  if (filters.minPrice !== undefined) params.set("minPrice", String(filters.minPrice));
  if (filters.maxPrice !== undefined) params.set("maxPrice", String(filters.maxPrice));
  if (filters.bedrooms !== undefined) params.set("bedrooms", String(filters.bedrooms));
  if (filters.bathrooms !== undefined) params.set("bathrooms", String(filters.bathrooms));
  if (filters.minArea !== undefined) params.set("minArea", String(filters.minArea));
  if (filters.visibility) params.set("visibility", filters.visibility);
  if (filters.status) params.set("status", filters.status);
  if (filters.sort !== "featured") params.set("sort", filters.sort);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/propiedades?${query}` : "/propiedades";
}

export function formatPropertyPrice(price: number, currency: Property["currency"]): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(price);
}
