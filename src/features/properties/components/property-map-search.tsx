"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { MapCanvas, type MapPoint } from "@/components/maps/map-canvas";
import { PropertyCard } from "@/features/properties/components/property-card";
import type { Property, PropertyType } from "@/features/properties/types/property";

const propertyTypes: Array<PropertyType | ""> = ["", "Casa", "Departamento", "Terreno", "Casa de campo"];

type NearbyStatus = "ready" | "unavailable" | "not_configured";

export function PropertyMapSearch({
  properties,
  status,
  initialCenter,
  initialRadius,
  searched,
}: {
  properties: Property[];
  status: NearbyStatus;
  initialCenter: { latitude: number; longitude: number };
  initialRadius: number;
  searched: boolean;
}) {
  const router = useRouter();
  const [center, setCenter] = useState(initialCenter);
  const [radius, setRadius] = useState(initialRadius);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [type, setType] = useState<PropertyType | "">("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [locationMessage, setLocationMessage] = useState("");

  const filteredProperties = useMemo(() => properties.filter((property) => (
    (!type || property.type === type) &&
    (!minPrice || property.price >= Number(minPrice)) &&
    (!maxPrice || property.price <= Number(maxPrice))
  )), [maxPrice, minPrice, properties, type]);

  const points: MapPoint[] = filteredProperties.flatMap((property) => {
    const latitude = property.location.latitude;
    const longitude = property.location.longitude;
    if (typeof latitude !== "number" || typeof longitude !== "number") return [];
    return [{
      id: property.id,
      latitude,
      longitude,
      label: property.title,
      selected: property.id === selectedId,
    }];
  });

  function performSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = new URLSearchParams({
      lat: center.latitude.toFixed(6),
      lon: center.longitude.toFixed(6),
      radius: String(radius),
    });
    router.push(`/propiedades/mapa?${query.toString()}`);
  }

  function locateMe() {
    if (!navigator.geolocation) {
      setLocationMessage("Este navegador no ofrece geolocalización.");
      return;
    }
    setLocationMessage("Solicitando ubicación al navegador…");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setCenter({ latitude: coords.latitude, longitude: coords.longitude });
        setLocationMessage("Ubicación seleccionada. Pulsa “Buscar en esta zona” para consultar propiedades.");
      },
      () => setLocationMessage("No se obtuvo tu ubicación. Puedes elegir un punto directamente en el mapa."),
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 10_000 },
    );
  }

  const unavailableMessage = status === "not_configured"
    ? "La búsqueda geográfica requiere configurar Supabase y sus migraciones."
    : "No se pudo consultar el mapa. Comprueba que PostGIS y la migración geográfica estén aplicados.";

  return (
    <div className="property-map-search">
      <form className="property-map-search__toolbar" onSubmit={performSearch}>
        <label>
          Radio de búsqueda
          <select onChange={(event) => setRadius(Number(event.target.value))} value={radius}>
            <option value={1000}>1 km</option>
            <option value={3000}>3 km</option>
            <option value={5000}>5 km</option>
            <option value={10000}>10 km</option>
            <option value={25000}>25 km</option>
            <option value={50000}>50 km</option>
          </select>
        </label>
        <button className="button button--secondary button--medium" onClick={locateMe} type="button">
          Usar mi ubicación
        </button>
        <button className="button button--primary button--medium" type="submit">
          Buscar en esta zona
        </button>
        <p aria-live="polite" className="property-map-search__location-message">{locationMessage}</p>
      </form>

      <div className="property-map-search__filters" aria-label="Filtros de mapa">
        <label>
          Tipo
          <select onChange={(event) => setType(event.target.value as PropertyType | "")} value={type}>
            {propertyTypes.map((item) => <option key={item || "all"} value={item}>{item || "Todos los tipos"}</option>)}
          </select>
        </label>
        <label>Precio mínimo<input inputMode="numeric" min="0" onChange={(event) => setMinPrice(event.target.value)} placeholder="Sin mínimo" type="number" value={minPrice} /></label>
        <label>Precio máximo<input inputMode="numeric" min="0" onChange={(event) => setMaxPrice(event.target.value)} placeholder="Sin máximo" type="number" value={maxPrice} /></label>
        <p aria-live="polite">{filteredProperties.length} resultados en el radio consultado</p>
      </div>

      {searched && status !== "ready" ? <p className="property-map-search__notice" role="status">{unavailableMessage}</p> : null}
      {status === "ready" && searched && properties.length === 0 ? (
        <p className="property-map-search__notice" role="status">No hay propiedades públicas con coordenadas en este radio. Prueba con otra zona o amplía el radio.</p>
      ) : null}

      <div className="property-map-search__workspace">
        <MapCanvas
          center={center}
          className="property-map-search__map"
          label="Mapa de búsqueda geográfica. Haz clic en una ubicación para cambiar el centro de búsqueda."
          onMapClick={setCenter}
          onPointClick={setSelectedId}
          points={points}
          radiusMeters={radius}
          zoom={radius >= 25000 ? 9 : radius >= 10000 ? 10 : radius >= 5000 ? 11 : 12}
        />
        <section aria-label="Propiedades cercanas" className="property-map-search__results">
          {filteredProperties.length ? filteredProperties.map((property) => (
            <div
              className={property.id === selectedId ? "property-map-search__card property-map-search__card--selected" : "property-map-search__card"}
              key={property.id}
              onMouseEnter={() => setSelectedId(property.id)}
              onFocus={() => setSelectedId(property.id)}
            >
              <PropertyCard property={property} />
            </div>
          )) : (
            <div className="property-map-search__empty">
              <h2>{searched ? "No hay resultados en este radio" : "Elige una zona para comenzar"}</h2>
              <p>{searched ? "Ajusta los filtros o selecciona otro punto en el mapa." : "Haz clic en el mapa o usa tu ubicación; después busca propiedades cercanas."}</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
