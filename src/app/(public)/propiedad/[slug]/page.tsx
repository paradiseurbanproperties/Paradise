import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/navigation/site-header";
import { PropertyCard } from "@/features/properties/components/property-card";
import { MapCanvas } from "@/components/maps/map-canvas";
import { PropertyViewTracker } from "@/features/analytics/components/property-view-tracker";
import { PropertyInquiryForm } from "@/features/crm/components/property-inquiry-form";
import { recordCustomerActivity } from "@/features/activity/services/customer-activity";
import { FavoriteToggle } from "@/features/favorites/components/favorite-toggle";
import { listOwnFavoritePropertyIds } from "@/features/favorites/repositories/favorite-repository";
import { findPublicPropertyBySlug, listPublicProperties, listPublicPropertyPriceHistory } from "@/features/properties/repositories/property-repository";
import { formatPropertyPrice } from "@/features/properties/services/property-catalog";
import { getCurrentAccessContext } from "@/lib/permissions/access";

type PropertyPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PropertyPageProps): Promise<Metadata> {
  const { slug } = await params;
  const property = await findPublicPropertyBySlug(slug);
  if (!property) return { title: "Propiedad no encontrada", robots: { index: false, follow: false } };
  return {
    title: property.title,
    description: property.summary,
    alternates: { canonical: `/propiedad/${encodeURIComponent(property.slug)}` },
    ...(property.demo ? { robots: { index: false, follow: false } } : {}),
    openGraph: { images: [property.images[0]?.src ?? "/images/property-placeholder.svg"] },
  };
}

export default async function PropertyDetailPage({ params }: PropertyPageProps) {
  const { slug } = await params;
  const property = await findPublicPropertyBySlug(slug);
  if (!property) notFound();

  const gallery = property.images.length
    ? property.images
    : [{ src: "/images/property-placeholder.svg", alt: "Propiedad sin fotografía disponible" }];
  const [cover, secondImage, thirdImage] = [gallery[0], gallery[1] ?? gallery[0], gallery[2] ?? gallery[0]];
  const [allProperties, priceHistory, access, favoriteState] = await Promise.all([
    listPublicProperties(),
    listPublicPropertyPriceHistory(property.id),
    getCurrentAccessContext(),
    listOwnFavoritePropertyIds(),
  ]);
  const otherProperties = allProperties.filter((item) => item.id !== property.id).slice(0, 3);
  const canFavorite = access?.role === "client" && access.status === "active";
  const showFavoriteControl = !access || canFavorite;
  const favoriteIds = new Set(favoriteState.ids);
  if (!property.demo && canFavorite) await recordCustomerActivity("property_viewed", property.id);

  return (
    <div className="site-frame">
      <SiteHeader />
      <main className="site-main detail-main" id="main-content">
        {!property.demo ? <PropertyViewTracker propertyId={property.id} /> : null}
        <div className="property-detail">
          <Link className="back-link" href="/propiedades">← Volver al catálogo</Link>

          <header className="property-detail__heading">
            <div>
              <p className="eyebrow">{property.type}{property.demo ? " · Ficha de demostración" : property.visibility === "premium" ? " · Exclusiva Premium" : " · Paradise"}</p>
              <h1 className="page-title">{property.title}</h1>
              <p className="property-detail__location">
                {property.location.neighborhood}, {property.location.city}, {property.location.state}
              </p>
            </div>
            <div className="property-detail__price">
              <span>{property.demo ? "Precio de muestra" : "Precio"}</span>
              <strong>{formatPropertyPrice(property.price, property.currency)}</strong>
            </div>
          </header>

          <div className="property-gallery">
            <figure className="property-gallery__main">
              <Image alt={cover.alt} fill priority sizes="(max-width: 800px) 100vw, 66vw" src={cover.src} unoptimized={!property.demo} />
            </figure>
            <figure>
              <Image alt={secondImage.alt} fill sizes="(max-width: 800px) 50vw, 33vw" src={secondImage.src} unoptimized={!property.demo} />
            </figure>
            <figure>
              <Image alt={thirdImage.alt} fill sizes="(max-width: 800px) 50vw, 33vw" src={thirdImage.src} unoptimized={!property.demo} />
            </figure>
            <span className="property-gallery__label">{property.demo ? "Fotografía ilustrativa" : "Fotografía de la propiedad"}</span>
          </div>

          <div className="property-detail__content">
            <div className="property-detail__main-column">
              {property.demo ? (
                <div className="demo-disclosure">
                  <strong>Ejemplo académico</strong>
                  <span>Esta propiedad, su ubicación y precio son ficticios. No está a la venta.</span>
                </div>
              ) : null}
              <section className="detail-section" aria-labelledby="property-description-title">
                <p className="eyebrow">Sobre el espacio</p>
                <h2 id="property-description-title">Un espacio con personalidad</h2>
                <p>{property.description}</p>
              </section>
              <section className="detail-section" aria-labelledby="property-features-title">
                <p className="eyebrow">Detalles</p>
                <h2 id="property-features-title">Características</h2>
                <ul className="feature-list">
                  {property.features.map((feature) => <li key={feature}>{feature}</li>)}
                </ul>
              </section>
              {typeof property.location.latitude === "number" && typeof property.location.longitude === "number" ? (
                <section className="detail-section property-detail__map-section" aria-labelledby="property-location-title">
                  <p className="eyebrow">Ubicación</p>
                  <h2 id="property-location-title">Explora la zona</h2>
                  <p>{property.location.neighborhood}, {property.location.city}, {property.location.state}</p>
                  <p>El marcador muestra una ubicación aproximada para proteger la privacidad del inmueble.</p>
                  <MapCanvas
                    center={{ latitude: property.location.latitude, longitude: property.location.longitude }}
                    className="property-detail__map"
                    label={`Mapa de ubicación de ${property.title}`}
                    points={[{
                      id: property.id,
                      latitude: property.location.latitude,
                      longitude: property.location.longitude,
                      label: property.title,
                    }]}
                    zoom={14}
                  />
                </section>
              ) : null}
              {priceHistory.length ? (
                <section className="detail-section" aria-labelledby="property-price-history-title">
                  <p className="eyebrow">Transparencia</p>
                  <h2 id="property-price-history-title">Historial de precios</h2>
                  <ol className="property-price-history">
                    {priceHistory.map((entry, index) => (
                      <li key={`${entry.changedAt}-${index}`}>
                        <time dateTime={entry.changedAt}>
                          {new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(new Date(entry.changedAt))}
                        </time>
                        <span>{formatPropertyPrice(entry.previousPrice, entry.currency)} → {formatPropertyPrice(entry.newPrice, entry.currency)}</span>
                      </li>
                    ))}
                  </ol>
                </section>
              ) : null}
            </div>

            <aside aria-label="Resumen de la propiedad" className="property-facts-panel">
              <p className="eyebrow">Resumen</p>
              {!property.demo && showFavoriteControl ? <FavoriteToggle canFavorite={canFavorite} isFavorite={favoriteIds.has(property.id)} propertyId={property.id} /> : null}
              <dl>
                {property.bedrooms > 0 ? <div><dt>Recámaras</dt><dd>{property.bedrooms}</dd></div> : null}
                {property.bathrooms > 0 ? <div><dt>Baños</dt><dd>{property.bathrooms}</dd></div> : null}
                {property.parking > 0 ? <div><dt>Estacionamientos</dt><dd>{property.parking}</dd></div> : null}
                {property.builtArea > 0 ? <div><dt>Construcción</dt><dd>{property.builtArea} m²</dd></div> : null}
                <div><dt>Terreno</dt><dd>{property.landArea} m²</dd></div>
                <div><dt>Estado</dt><dd>{property.status === "in_deal" ? "En trato" : property.status === "sold" ? "Vendida" : "Disponible"}</dd></div>
              </dl>
              {!property.demo && property.status === "available" ? (
                <PropertyInquiryForm propertyId={property.id} propertyTitle={property.title} />
              ) : (
                <p className="property-facts-panel__note">Esta ficha no recibe consultas en este momento.</p>
              )}
            </aside>
          </div>

          <section aria-labelledby="related-properties-title" className="related-properties">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Descubre más</p>
                <h2 id="related-properties-title">Otros espacios</h2>
              </div>
              <Link className="text-link" href="/propiedades">Ver catálogo completo ↗</Link>
            </div>
            <div className="property-grid property-grid--related">
              {otherProperties.map((item) => <PropertyCard canFavorite={canFavorite} isFavorite={favoriteIds.has(item.id)} key={item.id} property={item} showFavoriteControl={showFavoriteControl} />)}
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
