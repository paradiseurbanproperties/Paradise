import type { Metadata } from "next";
import Link from "next/link";
import * as motion from "motion/react-client";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/navigation/site-header";
import { PropertyCard } from "@/features/properties/components/property-card";
import { PropertyFiltersForm } from "@/features/properties/components/property-filters";
import { listPublicProperties } from "@/features/properties/repositories/property-repository";
import {
  filterAndPaginateProperties,
  parsePropertyFilters,
  propertyFilterHref,
} from "@/features/properties/services/property-catalog";
import type { PropertySearchParams } from "@/features/properties/types/property";
import { getCurrentAccessContext } from "@/lib/permissions/access";
import { listOwnFavoritePropertyIds } from "@/features/favorites/repositories/favorite-repository";

export const metadata: Metadata = {
  title: "Propiedades",
  description: "Explora las propiedades publicadas por Paradise.",
  alternates: { canonical: "/propiedades" },
};

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<PropertySearchParams>;
}) {
  const filters = parsePropertyFilters(await searchParams);
  const [properties, access, favoriteState] = await Promise.all([
    listPublicProperties(),
    getCurrentAccessContext(),
    listOwnFavoritePropertyIds(),
  ]);
  const canFavorite = access?.role === "client" && access.status === "active";
  const showFavoriteControl = !access || canFavorite;
  const favoriteIds = new Set(favoriteState.ids);
  const isDemoCatalog = properties.some((property) => property.demo);
  const result = filterAndPaginateProperties(properties, filters);
  const firstResult = result.totalItems === 0 ? 0 : (result.page - 1) * result.pageSize + 1;
  const lastResult = Math.min(result.page * result.pageSize, result.totalItems);

  return (
    <div className="site-frame">
      <SiteHeader />
      <main className="site-main catalog-main" id="main-content">
        <div className="catalog-page">
          <motion.header
            animate={{ opacity: 1, y: 0 }}
            className="catalog-heading"
            initial={{ opacity: 0, y: 22 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="eyebrow">Catálogo · Paradise</p>
            <h1 className="page-title">Encuentra un lugar para llamar tuyo.</h1>
            <p className="page-description">
              {isDemoCatalog
                ? "Explora una selección editorial de espacios. Las fichas con sello «Ilustrativa» presentan información y precios referenciales."
                : "Explora las propiedades disponibles y encuentra el espacio adecuado para ti."}
            </p>
          </motion.header>

          <motion.div
            animate={{ opacity: 1, y: 0 }}
            initial={{ opacity: 0, y: 18 }}
            transition={{ delay: 0.15, duration: 0.62, ease: [0.22, 1, 0.36, 1] }}
          >
            <PropertyFiltersForm filters={filters} />
          </motion.div>
          <motion.div
            animate={{ opacity: 1 }}
            className="catalog-map-link-row"
            initial={{ opacity: 0 }}
            transition={{ delay: 0.32, duration: 0.45 }}
          >
            <Link className="text-link" href="/propiedades/mapa">Explorar propiedades en el mapa ↗</Link>
          </motion.div>

          <div className="catalog-results-heading">
            <div>
              <p className="catalog-results-heading__eyebrow">
                {isDemoCatalog ? "Selección editorial" : "Propiedades publicadas"}
              </p>
              <h2>
                {result.totalItems} {result.totalItems === 1 ? "propiedad" : "propiedades"}
              </h2>
            </div>
            {result.totalItems > 0 ? (
              <p className="catalog-results-heading__range">
                {firstResult}–{lastResult} de {result.totalItems} propiedades
              </p>
            ) : null}
          </div>

          {result.items.length > 0 ? (
            <div className="property-grid">
              {result.items.map((property, index) => (
                <motion.div
                  initial={{ opacity: 0, y: 25 }}
                  key={property.id}
                  transition={{ delay: Math.min(index * 0.055, 0.38), duration: 0.58, ease: [0.22, 1, 0.36, 1] }}
                  viewport={{ amount: 0.12, once: true }}
                  whileHover={{ y: -5, transition: { type: "spring", stiffness: 320, damping: 24 } }}
                  whileInView={{ opacity: 1, y: 0 }}
                >
                  <PropertyCard canFavorite={canFavorite} isFavorite={favoriteIds.has(property.id)} property={property} priority={index < 2} showFavoriteControl={showFavoriteControl} />
                </motion.div>
              ))}
            </div>
          ) : (
            <section className="catalog-empty" aria-live="polite">
              <span aria-hidden="true" className="catalog-empty__mark">⌕</span>
              <h2>No encontramos coincidencias</h2>
              <p>Prueba con otra ubicación o amplía el rango de precio y superficie.</p>
              <Link className="button button--secondary button--medium" href="/propiedades">
                Quitar filtros
              </Link>
            </section>
          )}

          {result.totalPages > 1 ? (
            <nav aria-label="Paginación del catálogo" className="pagination">
              {result.page > 1 ? (
                <Link href={propertyFilterHref(filters, result.page - 1)}>← Anterior</Link>
              ) : <span aria-disabled="true">← Anterior</span>}
              <span aria-current="page" className="pagination__current">
                Página {result.page} de {result.totalPages}
              </span>
              {result.page < result.totalPages ? (
                <Link href={propertyFilterHref(filters, result.page + 1)}>Siguiente →</Link>
              ) : <span aria-disabled="true">Siguiente →</span>}
            </nav>
          ) : null}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
