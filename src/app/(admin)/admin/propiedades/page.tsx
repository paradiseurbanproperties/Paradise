import Link from "next/link";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/navigation/site-header";
import { AdminPropertyForm } from "@/features/properties/components/admin-property-form";
import { DeletePropertyButton, PropertyPublicationForm } from "@/features/properties/components/admin-property-controls";
import { PropertyImageManager } from "@/features/properties/components/property-image-manager";
import { requireProfileRole } from "@/lib/permissions/access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createPropertyImageUrlMap } from "@/features/properties/services/property-images";
import type { PropertyStatus, PropertyVisibility } from "@/features/properties/types/property";

export const metadata = { title: "Administrar propiedades" };

const typeLabels: Record<string, string> = {
  house: "Casa",
  apartment: "Departamento",
  land: "Terreno",
  country_house: "Casa de campo",
};

export default async function AdminPropertiesPage() {
  await requireProfileRole(["admin"]);
  const supabase = await createSupabaseServerClient();
  const { data: properties, error } = await supabase
    .from("properties")
    .select(`
      id, slug, title, description, property_type, price, status, visibility,
      publication_status, featured, bedrooms, bathrooms, parking, built_area,
      land_area, neighborhood, city, state, latitude, longitude, created_at,
      property_images (id, storage_path, alt_text, sort_order, is_cover),
      property_feature_values (property_features (label))
    `)
    .order("created_at", { ascending: false })
    .limit(100);

  const propertyIds = (properties ?? []).map((property) => property.id);
  const { data: privateDetails, error: privateDetailsError } = propertyIds.length
    ? await supabase.from("property_private_details")
      .select("property_id, address, postal_code, exact_latitude, exact_longitude")
      .in("property_id", propertyIds)
    : { data: [], error: null };
  const privateDetailsByProperty = new Map((privateDetails ?? []).map((details) => [details.property_id, details]));

  const imagePaths = (properties ?? []).flatMap((property) =>
    (property.property_images ?? []).map((image) => image.storage_path),
  );
  const signedUrls = await createPropertyImageUrlMap(imagePaths);

  return (
    <div className="site-frame">
      <SiteHeader />
      <main className="site-main admin-properties-main" id="main-content">
        <div className="admin-properties-content">
          <header className="admin-properties-heading">
            <p className="eyebrow">Administración · Inventario</p>
            <h1>Propiedades</h1>
            <p>Crea fichas persistentes, administra sus fotografías y controla su publicación.</p>
            <p>
              <Link className="text-link" href="/admin/usuarios">← Usuarios y permisos</Link>
              {" · "}
              <Link className="text-link" href="/admin/suscripciones">Planes Premium</Link>
            </p>
          </header>

          <section className="admin-properties-panel" aria-labelledby="create-property-heading">
            <div className="admin-properties-panel__heading">
              <div><p className="eyebrow">Nuevo inmueble</p><h2 id="create-property-heading">Crear una propiedad</h2></div>
            </div>
            <p className="admin-property-empty">Se guardará como borrador. Después podrás cargar fotografías y aprobar la publicación.</p>
            <AdminPropertyForm />
          </section>

          <section className="admin-properties-panel" aria-labelledby="property-list-heading">
            <div className="admin-properties-panel__heading">
              <div><p className="eyebrow">Inventario persistente</p><h2 id="property-list-heading">Propiedades guardadas</h2></div>
              <span className="admin-users-count">{properties?.length ?? 0}</span>
            </div>
            {error ? (
              <p className="admin-property-empty" role="alert">No se pudo consultar `properties`. Revisa que la migración 0003 esté aplicada y vuelve a cargar.</p>
            ) : privateDetailsError ? (
              <p className="admin-property-empty" role="alert">No se pudieron consultar los datos privados de las propiedades. Revisa que la migración 0021 esté aplicada.</p>
            ) : properties?.length ? (
              <div className="admin-property-list">
                {properties.map((property) => {
                  const details = privateDetailsByProperty.get(property.id);
                  const initialImages = [...(property.property_images ?? [])]
                    .sort((a, b) => Number(b.is_cover) - Number(a.is_cover) || a.sort_order - b.sort_order)
                    .map((image) => ({
                      id: image.id,
                      src: signedUrls.get(image.storage_path) ?? "/images/property-placeholder.svg",
                      alt: image.alt_text || property.title,
                    }));

                  return (
                    <article className="admin-property-row" key={property.id}>
                      <header className="admin-property-row__heading">
                        <div>
                          <p className="eyebrow">{typeLabels[property.property_type] ?? property.property_type} · {property.city}, {property.state}</p>
                          <h3>{property.title}</h3>
                          <p>{property.slug} · {new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(Number(property.price))}</p>
                        </div>
                        <span className={`property-publication-badge property-publication-badge--${property.publication_status}`}>
                          {property.publication_status === "approved" ? "Publicada" : property.publication_status === "pending" ? "Pendiente" : property.publication_status === "archived" ? "Archivada" : property.publication_status === "rejected" ? "Rechazada" : "Borrador"}
                        </span>
                      </header>

                      <PropertyPublicationForm
                        featured={property.featured}
                        propertyId={property.id}
                        publicationStatus={property.publication_status}
                        status={property.status as PropertyStatus}
                        visibility={property.visibility as PropertyVisibility}
                      />

                      {details ? <details className="admin-property-details">
                        <summary>Editar los datos de esta ficha</summary>
                        <AdminPropertyForm initial={{
                          id: property.id,
                          title: property.title,
                          description: property.description,
                          features: (property.property_feature_values ?? []).flatMap((item) => {
                            const feature = Array.isArray(item.property_features) ? item.property_features[0] : item.property_features;
                            return feature?.label ? [feature.label] : [];
                          }).join(", "),
                          propertyType: property.property_type,
                          price: Number(property.price),
                          bedrooms: property.bedrooms,
                          bathrooms: Number(property.bathrooms),
                          parking: property.parking,
                          builtArea: Number(property.built_area),
                          landArea: Number(property.land_area),
                          address: details.address,
                          neighborhood: property.neighborhood,
                          city: property.city,
                          state: property.state,
                          postalCode: details.postal_code,
                          latitude: details.exact_latitude,
                          longitude: details.exact_longitude,
                          status: property.status as PropertyStatus,
                          visibility: property.visibility as PropertyVisibility,
                        }} />
                      </details> : <p className="admin-property-empty" role="alert">No se encontraron los datos privados de esta propiedad.</p>}

                      <div className="admin-property-row__photos">
                        <h4>Fotografías · {initialImages.length}</h4>
                        <PropertyImageManager images={initialImages} propertyId={property.id} />
                      </div>

                      <div className="admin-property-row__footer">
                        <Link className="text-link" href={`/propiedad/${property.slug}`}>Ver ficha pública ↗</Link>
                        <DeletePropertyButton propertyId={property.id} />
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="admin-property-empty">Aún no hay propiedades. Crea la primera arriba para empezar.</p>
            )}
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
