import Image from "next/image";
import Link from "next/link";
import * as motion from "motion/react-client";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
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
import { VisitRequestForm } from "@/features/visits/components/visit-request-form";

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
    openGraph: { images: [property.images[0]?.src ?? "/images/property-placeholder.svg"] },
  };
}

export default async function PropertyDetailPage({ params }: PropertyPageProps) {
  const { slug } = await params;
  const property = await findPublicPropertyBySlug(slug);
  if (!property) notFound();
  if (slug !== property.slug) permanentRedirect(`/propiedad/${encodeURIComponent(property.slug)}`);

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
  if (canFavorite) await recordCustomerActivity("property_viewed", property.id);

  return (
    <div className="site-frame">
      <SiteHeader />
      <main className="site-main detail-main" id="main-content">
        <PropertyViewTracker propertyId={property.id} />
        <div className="property-detail">
          <Link className="back-link" href="/propiedades">← Volver al catálogo</Link>

          <motion.header
            animate={{ opacity: 1, y: 0 }}
            className="property-detail__heading"
            initial={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <div>
              <p className="eyebrow">{property.type}{property.visibility === "premium" ? " · Exclusiva Premium" : ""}</p>
              <h1 className="page-title">{property.title}</h1>
              <p className="property-detail__location">
                {property.location.neighborhood}, {property.location.city}, {property.location.state}
              </p>
            </div>
            <div className="property-detail__price">
              <span>Precio</span>
              <strong>{formatPropertyPrice(property.price, property.currency)}</strong>
            </div>
          </motion.header>

          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="property-gallery"
            initial={{ opacity: 0, y: 24 }}
            transition={{ delay: 0.12, duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.figure className="property-gallery__main" initial={{ opacity: 0, scale: 1.035 }} transition={{ duration: 0.8 }} viewport={{ once: true }} whileInView={{ opacity: 1, scale: 1 }}>
              <Image alt={cover.alt} fill priority sizes="(max-width: 800px) 100vw, 66vw" src={cover.src} unoptimized />
            </motion.figure>
            <motion.figure initial={{ opacity: 0, y: 16 }} transition={{ delay: 0.1, duration: 0.55 }} viewport={{ once: true }} whileInView={{ opacity: 1, y: 0 }}>
              <Image alt={secondImage.alt} fill sizes="(max-width: 800px) 50vw, 33vw" src={secondImage.src} unoptimized />
            </motion.figure>
            <motion.figure initial={{ opacity: 0, y: 16 }} transition={{ delay: 0.18, duration: 0.55 }} viewport={{ once: true }} whileInView={{ opacity: 1, y: 0 }}>
              <Image alt={thirdImage.alt} fill sizes="(max-width: 800px) 50vw, 33vw" src={thirdImage.src} unoptimized />
            </motion.figure>
            <span className="property-gallery__label">Fotografías</span>
          </motion.div>

          <div className="property-detail__content">
            <div className="property-detail__main-column">
              <motion.section className="detail-section" aria-labelledby="property-description-title" initial={{ opacity: 0, y: 20 }} transition={{ duration: 0.56 }} viewport={{ amount: 0.2, once: true }} whileInView={{ opacity: 1, y: 0 }}>
                <p className="eyebrow">Sobre el espacio</p>
                <h2 id="property-description-title">Un espacio con personalidad</h2>
                <p>{property.description}</p>
              </motion.section>
              <motion.section className="detail-section" aria-labelledby="property-features-title" initial={{ opacity: 0, y: 20 }} transition={{ duration: 0.56 }} viewport={{ amount: 0.2, once: true }} whileInView={{ opacity: 1, y: 0 }}>
                <p className="eyebrow">Detalles</p>
                <h2 id="property-features-title">Características</h2>
                <ul className="feature-list">
                  {property.features.map((feature) => <li key={feature}>{feature}</li>)}
                </ul>
              </motion.section>
              {typeof property.location.latitude === "number" && typeof property.location.longitude === "number" ? (
                <motion.section className="detail-section property-detail__map-section" aria-labelledby="property-location-title" initial={{ opacity: 0, y: 20 }} transition={{ duration: 0.56 }} viewport={{ amount: 0.15, once: true }} whileInView={{ opacity: 1, y: 0 }}>
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
                </motion.section>
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
              {showFavoriteControl ? <FavoriteToggle canFavorite={canFavorite} isFavorite={favoriteIds.has(property.id)} propertyId={property.id} /> : null}
              <dl>
                {property.bedrooms > 0 ? <div><dt>Recámaras</dt><dd>{property.bedrooms}</dd></div> : null}
                {property.bathrooms > 0 ? <div><dt>Baños</dt><dd>{property.bathrooms}</dd></div> : null}
                {property.parking > 0 ? <div><dt>Estacionamientos</dt><dd>{property.parking}</dd></div> : null}
                {property.builtArea > 0 ? <div><dt>Construcción</dt><dd>{property.builtArea} m²</dd></div> : null}
                <div><dt>Terreno</dt><dd>{property.landArea} m²</dd></div>
                <div><dt>Estado</dt><dd>{property.status === "in_deal" ? "En trato" : property.status === "sold" ? "Vendida" : "Disponible"}</dd></div>
              </dl>
              {property.status === "available" ? (
                <>
                  <PropertyInquiryForm propertyId={property.id} propertyTitle={property.title} />
                  {access?.role === "client" && access.status === "active" ? <VisitRequestForm propertyId={property.id} propertyTitle={property.title} /> : !access ? <section className="visit-login-note"><h2>¿Quieres conocer esta propiedad?</h2><p>Inicia sesión como cliente para solicitar una visita.</p><Link className="button button--secondary button--medium" href={`/login?next=%2Fpropiedad%2F${encodeURIComponent(property.slug)}`}>Iniciar sesión</Link></section> : null}
                </>
              ) : (
                <p className="property-facts-panel__note">Esta ficha no recibe consultas en este momento.</p>
              )}
            </aside>
          </div>

          <motion.section
            aria-labelledby="related-properties-title"
            className="related-properties"
            initial={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.65 }}
            viewport={{ amount: 0.1, once: true }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            <div className="section-heading">
              <div>
                <p className="eyebrow">Descubre más</p>
                <h2 id="related-properties-title">Otros espacios</h2>
              </div>
              <Link className="text-link" href="/propiedades">Ver catálogo completo ↗</Link>
            </div>
            <div className="property-grid property-grid--related">
              {otherProperties.map((item, index) => (
                <motion.div initial={{ opacity: 0, y: 20 }} key={item.id} transition={{ delay: index * 0.08, duration: 0.55 }} viewport={{ once: true }} whileHover={{ y: -5, transition: { type: "spring", stiffness: 320, damping: 24 } }} whileInView={{ opacity: 1, y: 0 }}>
                  <PropertyCard canFavorite={canFavorite} isFavorite={favoriteIds.has(item.id)} property={item} showFavoriteControl={showFavoriteControl} />
                </motion.div>
              ))}
            </div>
          </motion.section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
