export type PropertyType = "Casa" | "Departamento" | "Terreno" | "Casa de campo";
export type PropertyStatus = "available" | "in_deal" | "sold";
export type PropertyVisibility = "public" | "premium" | "both";

export type PropertyImage = {
  src: string;
  alt: string;
};

export type Property = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  type: PropertyType;
  price: number;
  currency: "MXN";
  status: PropertyStatus;
  visibility: PropertyVisibility;
  location: {
    neighborhood: string;
    city: string;
    state: string;
    latitude?: number | null;
    longitude?: number | null;
  };
  bedrooms: number;
  bathrooms: number;
  parking: number;
  builtArea: number;
  landArea: number;
  features: string[];
  images: PropertyImage[];
  featured: boolean;
  demo: boolean;
};

export type PropertySearchParams = Record<string, string | string[] | undefined>;

export type PropertyFilters = {
  query: string;
  type: PropertyType | "";
  minPrice: number | undefined;
  maxPrice: number | undefined;
  bedrooms: number | undefined;
  bathrooms: number | undefined;
  minArea: number | undefined;
  visibility: "public" | "both" | "";
  status: PropertyStatus | "";
  sort: "featured" | "price-asc" | "price-desc";
  page: number;
};

export type PropertyPage = {
  items: Property[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};
