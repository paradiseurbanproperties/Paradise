import { describe, expect, it } from "vitest";
import type { Property, PropertyFilters } from "@/features/properties/types/property";
import { filterAndPaginateProperties, parsePropertyFilters, propertyFilterHref } from "./property-catalog";

const baseProperty: Property = {
  id: "property-1",
  slug: "casa-alamos",
  title: "Casa en Álamos",
  summary: "Casa amplia",
  description: "Casa de prueba",
  type: "Casa",
  price: 2_000_000,
  currency: "MXN",
  status: "available",
  visibility: "public",
  location: { neighborhood: "Álamos", city: "Querétaro", state: "Querétaro" },
  bedrooms: 3,
  bathrooms: 2,
  parking: 1,
  builtArea: 120,
  landArea: 150,
  features: ["Terraza"],
  images: [],
  featured: false,
};

const defaultFilters: PropertyFilters = {
  query: "",
  type: "",
  minPrice: undefined,
  maxPrice: undefined,
  bedrooms: undefined,
  bathrooms: undefined,
  minArea: undefined,
  visibility: "",
  status: "",
  sort: "featured",
  page: 1,
};

describe("catálogo público", () => {
  it("normaliza filtros y descarta valores fuera de límites", () => {
    expect(parsePropertyFilters({
      q: "  casa  ",
      type: "Penthouse",
      minPrice: "-1",
      maxPrice: "1200000",
      bedrooms: "99",
      sort: "sql-injection",
      page: "0",
    })).toEqual({
      ...defaultFilters,
      query: "casa",
      maxPrice: 1_200_000,
    });
  });

  it("busca sin distinguir acentos y ordena resultados por precio", () => {
    const second = {
      ...baseProperty,
      id: "property-2",
      slug: "casa-centro",
      title: "Casa Centro",
      price: 1_500_000,
      location: { ...baseProperty.location, neighborhood: "Centro" },
    };
    const properties = [baseProperty, second];
    const accentedSearch = filterAndPaginateProperties(properties, { ...defaultFilters, query: "alamos" });
    const sorted = filterAndPaginateProperties(properties, { ...defaultFilters, sort: "price-asc" });

    expect(accentedSearch.items.map(({ id }) => id)).toEqual([baseProperty.id]);
    expect(sorted.items.map(({ id }) => id)).toEqual([second.id, baseProperty.id]);
    expect(sorted.totalItems).toBe(2);
    expect(sorted.totalPages).toBe(1);
  });

  it("serializa filtros válidos sin perder caracteres acentuados", () => {
    expect(propertyFilterHref({ ...defaultFilters, query: "Álamos", maxPrice: 1_000_000 }, 2))
      .toBe("/propiedades?q=%C3%81lamos&maxPrice=1000000&page=2");
  });
});
