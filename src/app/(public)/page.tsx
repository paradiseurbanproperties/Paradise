import Image from "next/image";
import Link from "next/link";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/navigation/site-header";
import { PropertyCard } from "@/features/properties/components/property-card";
import { listPublicProperties } from "@/features/properties/repositories/property-repository";
import { getCurrentAccessContext } from "@/lib/permissions/access";
import { listOwnFavoritePropertyIds } from "@/features/favorites/repositories/favorite-repository";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Encuentra tu próximo hogar",
  description: "Explora propiedades publicadas y recibe acompañamiento inmobiliario para encontrar un espacio para ti.",
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const [properties, access, favoriteState] = await Promise.all([
    listPublicProperties(),
    getCurrentAccessContext(),
    listOwnFavoritePropertyIds(),
  ]);
  const canFavorite = access?.role === "client" && access.status === "active";
  const showFavoriteControl = !access || canFavorite;
  const favoriteIds = new Set(favoriteState.ids);
  const featured = properties
    .filter((property) => property.featured)
    .slice(0, 3);

  return (
    <div className="site-frame">
      <SiteHeader />
      <main className="site-main home-main" id="main-content">
        <section aria-labelledby="home-title" className="intro">
          <div className="intro__copy">
            <p className="eyebrow">Paradise · Propiedades</p>
            <h1 className="intro__title" id="home-title">
              Un lugar para sentirte <em>en casa.</em>
            </h1>
            <p className="intro__description">
              Encuentra espacios con personalidad y el acompañamiento necesario
              para elegir el siguiente lugar de tu historia.
            </p>

            <form action="/propiedades" className="home-search" method="get">
              <label className="home-search__location">
                <span>¿Dónde te gustaría vivir?</span>
                <input name="q" placeholder="Ciudad, colonia o zona" type="search" />
              </label>
              <label className="home-search__type">
                <span>Tipo de espacio</span>
                <select defaultValue="" name="type">
                  <option value="">Todos</option>
                  <option value="Casa">Casa</option>
                  <option value="Departamento">Departamento</option>
                  <option value="Terreno">Terreno</option>
                  <option value="Casa de campo">Casa de campo</option>
                </select>
              </label>
              <button className="button button--primary button--large" type="submit">
                Explorar espacios <span aria-hidden="true">↗</span>
              </button>
            </form>
            <p className="intro__note">
              <span aria-hidden="true" className="intro__note-dot" />
              {properties.some((property) => property.demo)
                ? "Vitrina académica con propiedades ficticias"
                : "Inventario actualizado desde Paradise"}
            </p>
          </div>

          <figure className="intro-art">
            <div className="intro-art__frame">
              <Image
                alt="Sala luminosa con ventanales y materiales naturales"
                className="intro-art__image"
                fill
                priority
                sizes="(max-width: 760px) 90vw, 42vw"
                src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1600&q=84"
              />
            </div>
            <figcaption className="intro-art__caption">
              <span className="intro-art__caption-mark" aria-hidden="true">P.</span>
              <span><strong>Espacios para lo que viene</strong><small>Fotografía de inspiración</small></span>
            </figcaption>
          </figure>
        </section>

        <section aria-labelledby="featured-title" className="featured-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Una primera mirada</p>
              <h2 id="featured-title">Espacios con algo especial</h2>
            </div>
            <Link className="text-link" href="/propiedades">Explorar el catálogo ↗</Link>
          </div>
          {featured.some((property) => property.demo) ? (
            <p className="demo-banner">
              Las propiedades, fotografías, ubicaciones y precios de esta vitrina son ilustrativos.
            </p>
          ) : null}
          {featured.length ? (
            <div className="property-grid">
              {featured.map((property, index) => (
                <PropertyCard canFavorite={canFavorite} isFavorite={favoriteIds.has(property.id)} key={property.id} property={property} priority={index === 0} showFavoriteControl={showFavoriteControl} />
              ))}
            </div>
          ) : (
            <p className="catalog-empty">Pronto mostraremos las propiedades destacadas.</p>
          )}
        </section>

        <section aria-label="Acompañamiento Paradise" className="home-signature">
          <p className="eyebrow">Paradise · Encuentra tu lugar</p>
          <p>Una búsqueda bien acompañada empieza con escuchar lo que necesitas.</p>
          <Link className="button button--secondary button--medium" href="/propiedades">
            Conocer los espacios
          </Link>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
