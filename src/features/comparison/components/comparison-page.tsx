"use client";

import Link from "next/link";
import type { Property } from "@/features/properties/types/property";
import { useComparison } from "@/features/comparison/components/comparison-provider";
import { formatPropertyPrice } from "@/features/properties/services/property-catalog";

export function ComparisonPage({ properties }: { properties: Property[] }) {
  const { ids, remove, clear } = useComparison();
  const byId = new Map(properties.map((property) => [property.id, property]));
  const selected = ids.flatMap((id) => {
    const property = byId.get(id);
    return property ? [property] : [];
  });

  return (
    <div className="comparison-content">
      <header className="comparison-heading">
        <p className="eyebrow">Herramientas de búsqueda</p>
        <h1>Comparar propiedades</h1>
        <p>Revisa precios, ubicación y características lado a lado. La selección se guarda solo en este navegador.</p>
      </header>
      {!selected.length ? (
        <section className="comparison-empty">
          <span aria-hidden="true">⇄</span>
          <h2>{ids.length ? "Las propiedades seleccionadas ya no están disponibles" : "Elige hasta cuatro propiedades"}</h2>
          <p>{ids.length ? "Quita la selección guardada y elige propiedades visibles." : "Desde una tarjeta, pulsa “Comparar” para agregarla a esta tabla."}</p>
          {ids.length ? <button className="button button--secondary button--medium" onClick={clear} type="button">Limpiar selección</button> : null}
          <Link className="button button--secondary button--medium" href="/propiedades">Explorar propiedades</Link>
        </section>
      ) : (
        <>
          <div className="comparison-actions"><span>{selected.length} de 4 propiedades</span><button className="comparison-clear" onClick={clear} type="button">Quitar todas</button></div>
          {selected.length < ids.length ? <p className="comparison-demo-note">Algunas propiedades guardadas ya no están disponibles y no se muestran.</p> : null}
          <div className="comparison-table-wrap" tabIndex={0}>
            <table className="comparison-table">
              <thead>
                <tr>
                  <th scope="col">Característica</th>
                  {selected.map((property) => (
                    <th key={property.id} scope="col">
                      <div className="comparison-property-heading">
                        <Link href={`/propiedad/${property.slug}`}>{property.title}</Link>
                        {property.demo ? <span>Demo</span> : null}
                        <button aria-label={`Quitar ${property.title} de la comparación`} onClick={() => remove(property.id)} type="button">Quitar</button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <ComparisonRow label="Precio">{selected.map((property) => <td key={property.id}>{formatPropertyPrice(property.price, property.currency)}</td>)}</ComparisonRow>
                <ComparisonRow label="Tipo">{selected.map((property) => <td key={property.id}>{property.type}</td>)}</ComparisonRow>
                <ComparisonRow label="Ubicación">{selected.map((property) => <td key={property.id}>{property.location.neighborhood ? `${property.location.neighborhood}, ` : ""}{property.location.city}, {property.location.state}</td>)}</ComparisonRow>
                <ComparisonRow label="Estado">{selected.map((property) => <td key={property.id}>{property.status === "available" ? "Disponible" : property.status === "in_deal" ? "En trato" : "Vendida"}</td>)}</ComparisonRow>
                <ComparisonRow label="Recámaras">{selected.map((property) => <td key={property.id}>{property.bedrooms || "—"}</td>)}</ComparisonRow>
                <ComparisonRow label="Baños">{selected.map((property) => <td key={property.id}>{property.bathrooms || "—"}</td>)}</ComparisonRow>
                <ComparisonRow label="Estacionamientos">{selected.map((property) => <td key={property.id}>{property.parking || "—"}</td>)}</ComparisonRow>
                <ComparisonRow label="Construcción">{selected.map((property) => <td key={property.id}>{property.builtArea ? `${property.builtArea} m²` : "—"}</td>)}</ComparisonRow>
                <ComparisonRow label="Terreno">{selected.map((property) => <td key={property.id}>{property.landArea ? `${property.landArea} m²` : "—"}</td>)}</ComparisonRow>
                <ComparisonRow label="Características">{selected.map((property) => <td key={property.id}>{property.features.length ? property.features.join(", ") : "—"}</td>)}</ComparisonRow>
              </tbody>
            </table>
          </div>
          {selected.some((property) => property.demo) ? <p className="comparison-demo-note">Las filas marcadas “Demo” muestran datos académicos ficticios.</p> : null}
        </>
      )}
    </div>
  );
}

function ComparisonRow({ label, children }: { label: string; children: React.ReactNode }) {
  return <tr><th scope="row">{label}</th>{children}</tr>;
}
