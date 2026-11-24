import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/navigation/site-header";
import { PropertyCard } from "@/features/properties/components/property-card";
import { FavoriteListPropertyPicker, RemoveFavoriteListProperty } from "@/features/favorites/components/favorite-list-manager";
import { getOwnFavoriteList } from "@/features/favorites/repositories/favorite-list-repository";
import { listOwnFavoritePropertyIds } from "@/features/favorites/repositories/favorite-repository";
import { listPublicProperties } from "@/features/properties/repositories/property-repository";
import { requireProfileRole } from "@/lib/permissions/access";

export const metadata = { title: "Propiedades de la lista" };

export default async function FavoriteListDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireProfileRole(["client"]);
  const { id } = await params;
  const [listResult, favoriteResult, catalog] = await Promise.all([
    getOwnFavoriteList(id),
    listOwnFavoritePropertyIds(),
    listPublicProperties(),
  ]);
  if (!listResult.list) {
    if (listResult.unavailable) {
      return (
        <div className="site-frame"><SiteHeader /><main className="site-main favorites-main" id="main-content"><section className="favorites-empty" role="alert"><h1>No se pudo cargar la lista</h1><p>Comprueba que la migración 0015 esté aplicada.</p><Link href="/favoritos/listas">Volver a mis listas</Link></section></main><SiteFooter /></div>
      );
    }
    notFound();
  }

  const propertyById = new Map(catalog.filter((property) => !property.demo).map((property) => [property.id, property]));
  const properties = listResult.list.propertyIds.flatMap((propertyId) => {
    const property = propertyById.get(propertyId);
    return property ? [property] : [];
  });
  const currentFavorites = new Set(favoriteResult.ids);
  const candidates = favoriteResult.unavailable
    ? []
    : catalog.filter((property) => !property.demo && currentFavorites.has(property.id) && !listResult.list?.propertyIds.includes(property.id))
      .map(({ id: propertyId, title }) => ({ id: propertyId, title }));

  return (
    <div className="site-frame">
      <SiteHeader />
      <main className="site-main favorites-main" id="main-content">
        <div className="favorites-content">
          <Link className="favorite-list-back" href="/favoritos/listas">← Volver a mis listas</Link>
          <header className="favorites-heading">
            <p className="eyebrow">Colección personal</p>
            <h1>{listResult.list.name}</h1>
            <p>{properties.length} {properties.length === 1 ? "propiedad visible" : "propiedades visibles"} en esta lista.</p>
          </header>
          <FavoriteListPropertyPicker candidates={candidates} listId={listResult.list.id} />
          {!candidates.length ? <p className="favorite-list-empty">{favoriteResult.unavailable ? "No se pudieron cargar tus favoritos; vuelve a intentarlo." : "Guarda más propiedades en tus favoritos para agregarlas a esta lista."}</p> : null}
          {properties.length ? (
            <div className="property-grid">
              {properties.map((property) => (
                <article className="favorite-list-property" key={property.id}>
                  <PropertyCard canFavorite isFavorite property={property} showFavoriteControl />
                  <RemoveFavoriteListProperty listId={listResult.list!.id} propertyId={property.id} title={property.title} />
                </article>
              ))}
            </div>
          ) : (
            <section className="favorites-empty"><span aria-hidden="true">▤</span><h2>Esta lista aún está vacía</h2><p>Agrega propiedades desde tus favoritos cuando quieras.</p><Link className="button button--secondary button--medium" href="/propiedades">Explorar propiedades</Link></section>
          )}
          {properties.length < listResult.list.propertyIds.length ? <p className="favorite-list-empty">Algunas propiedades de la lista ya no están disponibles; se ocultaron.</p> : null}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
