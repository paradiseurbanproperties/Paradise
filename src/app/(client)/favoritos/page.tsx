import Link from "next/link";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/navigation/site-header";
import { PropertyCard } from "@/features/properties/components/property-card";
import { listOwnFavoritePropertyIds } from "@/features/favorites/repositories/favorite-repository";
import { listOwnFavoriteLists } from "@/features/favorites/repositories/favorite-list-repository";
import { listPublicProperties } from "@/features/properties/repositories/property-repository";
import { requireProfileRole } from "@/lib/permissions/access";

export const metadata = { title: "Mis favoritos" };

export default async function FavoritesPage() {
  await requireProfileRole(["client"]);
  const [{ ids, unavailable }, { lists, unavailable: listsUnavailable }, catalog] = await Promise.all([
    listOwnFavoritePropertyIds(),
    listOwnFavoriteLists(),
    listPublicProperties(),
  ]);
  const favoriteIds = new Set(ids);
  const properties = catalog.filter((property) => favoriteIds.has(property.id) && !property.demo);

  return (
    <div className="site-frame">
      <SiteHeader />
      <main className="site-main favorites-main" id="main-content">
        <div className="favorites-content">
          <header className="favorites-heading">
            <p className="eyebrow">Tu espacio Paradise</p>
            <h1>Mis favoritos</h1>
            <p>Guarda propiedades para volver a ellas fácilmente.</p>
          </header>
          <Link className="favorite-lists-link" href="/favoritos/listas">Organizar mis favoritos en listas <span aria-hidden="true">→</span><span className="favorite-lists-link__count">{listsUnavailable ? "!" : lists.length}</span></Link>
          {unavailable ? (
            <section className="favorites-empty" role="alert"><h2>No se pudieron cargar tus favoritos</h2><p>Comprueba que la migración 0014 esté aplicada en Supabase.</p></section>
          ) : properties.length ? (
            <><p className="favorites-count">{properties.length} {properties.length === 1 ? "propiedad guardada" : "propiedades guardadas"}</p><div className="property-grid">{properties.map((property) => <PropertyCard canFavorite isFavorite key={property.id} property={property} showFavoriteControl />)}</div></>
          ) : (
            <section className="favorites-empty">
              <span aria-hidden="true">♡</span>
              <h2>Aún no guardas propiedades</h2>
              <p>Usa “Guardar” en una propiedad para tenerla a mano aquí.</p>
              <Link className="button button--secondary button--medium" href="/propiedades">Explorar propiedades</Link>
            </section>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
