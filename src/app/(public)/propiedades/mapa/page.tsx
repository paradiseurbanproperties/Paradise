import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/navigation/site-header";
import { PropertyMapSearch } from "@/features/properties/components/property-map-search";
import { listPublicPropertiesNearby } from "@/features/properties/repositories/property-repository";

export const metadata: Metadata = {
  title: "Buscar en el mapa",
  description: "Encuentra propiedades publicadas cerca de la zona que elijas.",
  alternates: { canonical: "/propiedades/mapa" },
};

const DEFAULT_CENTER = { latitude: 19.4326, longitude: -99.1332 };
const ALLOWED_RADII = new Set([1000, 3000, 5000, 10000, 25000, 50000]);

function numberParam(value: string | string[] | undefined): number | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw?.trim()) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export default async function PropertyMapPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const latitude = numberParam(params.lat);
  const longitude = numberParam(params.lon);
  const hasValidCenter = latitude !== undefined && longitude !== undefined &&
    latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
  const center = hasValidCenter ? { latitude, longitude } : DEFAULT_CENTER;
  const requestedRadius = numberParam(params.radius) ?? 5000;
  const radius = ALLOWED_RADII.has(requestedRadius) ? requestedRadius : 5000;
  const searched = hasValidCenter;
  const result = searched
    ? await listPublicPropertiesNearby({ latitude: center.latitude, longitude: center.longitude, radiusMeters: radius })
    : { properties: [], status: "ok" as const };
  const status = result.status === "ok" ? "ready" : result.status;

  return (
    <div className="site-frame">
      <SiteHeader />
      <main className="site-main catalog-main" id="main-content">
        <div className="catalog-page">
          <header className="catalog-heading">
            <p className="eyebrow">Explorar · Mapa</p>
            <h1 className="page-title">Encuentra propiedades por ubicación.</h1>
            <p className="page-description">Elige un punto y explora publicaciones públicas cercanas. Las ubicaciones solo aparecen cuando la propiedad tiene coordenadas guardadas.</p>
            <Link className="text-link" href="/propiedades">← Volver al catálogo</Link>
          </header>
          <PropertyMapSearch
            initialCenter={center}
            initialRadius={radius}
            properties={result.properties}
            searched={searched}
            status={status}
          />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
