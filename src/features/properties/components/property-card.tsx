import Image from "next/image";
import Link from "next/link";
import { formatPropertyPrice } from "@/features/properties/services/property-catalog";
import type { Property } from "@/features/properties/types/property";
import { FavoriteToggle } from "@/features/favorites/components/favorite-toggle";
import { CompareToggle } from "@/features/comparison/components/compare-toggle";

type PropertyCardProps = {
  property: Property;
  priority?: boolean;
  showFavoriteControl?: boolean;
  canFavorite?: boolean;
  isFavorite?: boolean;
};

export function PropertyCard({ property, priority = false, showFavoriteControl = false, canFavorite = false, isFavorite = false }: PropertyCardProps) {
  const cover = property.images[0] ?? {
    src: "/images/property-placeholder.svg",
    alt: "Propiedad sin fotografía disponible",
  };
  return (
    <article className="property-card">
      <Link
        className="property-card__media"
        href={`/propiedad/${property.slug}`}
      >
        <Image
          alt={cover.alt}
          className="property-card__image"
          fill
          priority={priority}
          unoptimized={!property.demo || cover.src.includes("/storage/v1/object/")}
          sizes="(max-width: 720px) 100vw, (max-width: 1100px) 50vw, 33vw"
          src={cover.src}
        />
        {property.demo ? <span className="property-card__demo">Ejemplo académico</span> : null}
        {property.visibility === "premium" ? <span className="property-card__premium">✦ Exclusiva Premium</span> : null}
        {property.status === "in_deal" ? (
          <span className="property-card__status">En trato</span>
        ) : null}
      </Link>

      <div className="property-card__tools">
        {showFavoriteControl && !property.demo ? <FavoriteToggle canFavorite={canFavorite} isFavorite={isFavorite} propertyId={property.id} /> : null}
        <CompareToggle propertyId={property.id} />
      </div>

      <div className="property-card__body">
        <p className="property-card__location">
          {property.location.neighborhood} · {property.location.city}
        </p>
        <div className="property-card__heading-row">
          <h3 className="property-card__title">
            <Link href={`/propiedad/${property.slug}`}>{property.title}</Link>
          </h3>
          <span className="property-card__type">{property.type}</span>
        </div>
        <p className="property-card__summary">{property.summary}</p>
        <ul aria-label="Características" className="property-card__facts">
          {property.bedrooms > 0 ? <li>{property.bedrooms} recámaras</li> : null}
          {property.bathrooms > 0 ? <li>{property.bathrooms} baños</li> : null}
          <li>{property.builtArea > 0 ? `${property.builtArea} m² construcción` : `${property.landArea} m² terreno`}</li>
        </ul>
        <div className="property-card__footer">
          <p className="property-card__price">
            <span>{property.demo ? "Precio de muestra" : "Precio"}</span>
            {formatPropertyPrice(property.price, property.currency)}
          </p>
          <Link className="property-card__link" href={`/propiedad/${property.slug}`}>
            Ver ficha <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
