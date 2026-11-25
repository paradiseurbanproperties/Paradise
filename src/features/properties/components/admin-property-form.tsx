"use client";

import { useActionState, useState } from "react";
import { MapCanvas } from "@/components/maps/map-canvas";
import {
  createAdminPropertyAction,
  updateAdminPropertyDetailsAction,
} from "@/features/properties/actions/admin-property-actions";
import { EMPTY_ADMIN_PROPERTY_STATE } from "@/features/properties/schemas/admin-property";
import type { PropertyStatus, PropertyVisibility } from "@/features/properties/types/property";

export type AdminPropertyFormValues = {
  id?: string;
  title: string;
  description: string;
  features: string;
  propertyType: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  parking: number;
  builtArea: number;
  landArea: number;
  address: string;
  neighborhood: string;
  city: string;
  state: string;
  postalCode: string;
  latitude: number | null;
  longitude: number | null;
  status: PropertyStatus;
  visibility: PropertyVisibility;
};

const blankProperty: AdminPropertyFormValues = {
  title: "",
  description: "",
  features: "",
  propertyType: "house",
  price: 0,
  bedrooms: 0,
  bathrooms: 0,
  parking: 0,
  builtArea: 0,
  landArea: 0,
  address: "",
  neighborhood: "",
  city: "",
  state: "",
  postalCode: "",
  latitude: null,
  longitude: null,
  status: "available",
  visibility: "public",
};

export function AdminPropertyForm({ initial = blankProperty }: { initial?: AdminPropertyFormValues }) {
  const action = initial.id ? updateAdminPropertyDetailsAction : createAdminPropertyAction;
  const [state, formAction, pending] = useActionState(action, EMPTY_ADMIN_PROPERTY_STATE);
  const [latitude, setLatitude] = useState<number | null>(initial.latitude);
  const [longitude, setLongitude] = useState<number | null>(initial.longitude);
  const mapCenter = {
    latitude: latitude ?? 19.4326,
    longitude: longitude ?? -99.1332,
  };
  const selectedPoint = latitude !== null && longitude !== null
    ? [{ id: "property-location", latitude, longitude, label: "Ubicación de la propiedad", draggable: true }]
    : [];

  function updateCoordinates(point: { latitude: number; longitude: number }) {
    setLatitude(Number(point.latitude.toFixed(6)));
    setLongitude(Number(point.longitude.toFixed(6)));
  }

  return (
    <form action={formAction} className="admin-property-form">
      {initial.id ? <input name="propertyId" type="hidden" value={initial.id} /> : null}
      <div className="admin-property-form__grid">
        <label className="admin-property-form__wide">
          Nombre de la propiedad
          <input defaultValue={initial.title} maxLength={120} name="title" required />
        </label>
        <label>
          Tipo
          <select defaultValue={initial.propertyType} name="propertyType">
            <option value="house">Casa</option>
            <option value="apartment">Departamento</option>
            <option value="land">Terreno</option>
            <option value="country_house">Casa de campo</option>
          </select>
        </label>
        <label>
          Precio (MXN)
          <input defaultValue={initial.price || ""} max="999999999999.99" min="0.01" name="price" required step="0.01" type="number" />
        </label>
        <label className="admin-property-form__wide">
          Descripción
          <textarea defaultValue={initial.description} maxLength={6000} minLength={30} name="description" required rows={4} />
        </label>
        <label className="admin-property-form__wide">
          Características (separadas por coma)
          <input defaultValue={initial.features} maxLength={1600} name="features" placeholder="Terraza, jardín, cocina integral" />
        </label>
        <label>Recámaras<input defaultValue={initial.bedrooms} min="0" name="bedrooms" type="number" /></label>
        <label>Baños<input defaultValue={initial.bathrooms} min="0" name="bathrooms" step="0.5" type="number" /></label>
        <label>Estacionamientos<input defaultValue={initial.parking} min="0" name="parking" type="number" /></label>
        <label>Construcción (m²)<input defaultValue={initial.builtArea} min="0" name="builtArea" step="0.1" type="number" /></label>
        <label>Terreno (m²)<input defaultValue={initial.landArea} min="0" name="landArea" step="0.1" type="number" /></label>
        <label>Estado comercial
          <select defaultValue={initial.status} name="status">
            <option value="available">Disponible</option>
            <option value="in_deal">En trato</option>
            <option value="sold">Vendida</option>
          </select>
        </label>
        <label>Visibilidad
          <select defaultValue={initial.visibility} name="visibility">
            <option value="public">Público general</option>
            <option value="premium">Exclusiva Premium</option>
            <option value="both">Público y Premium</option>
          </select>
        </label>
        <label className="admin-property-form__wide">Dirección<input defaultValue={initial.address} maxLength={240} name="address" /></label>
        <label>Colonia<input defaultValue={initial.neighborhood} maxLength={120} name="neighborhood" /></label>
        <label>Ciudad<input defaultValue={initial.city} maxLength={120} name="city" required /></label>
        <label>Estado<input defaultValue={initial.state} maxLength={120} name="state" required /></label>
        <label>Código postal<input defaultValue={initial.postalCode} maxLength={16} name="postalCode" /></label>
        <div className="admin-property-form__wide admin-property-coordinate-fields">
          <div className="admin-property-coordinate-fields__heading">
            <div>
              <p>Ubicación geográfica</p>
              <span>Haz clic en el mapa para colocar el marcador o arrástralo para ajustar el punto.</span>
            </div>
            {latitude !== null && longitude !== null ? (
              <button className="text-link" onClick={() => { setLatitude(null); setLongitude(null); }} type="button">
                Quitar ubicación
              </button>
            ) : null}
          </div>
          <MapCanvas
            center={mapCenter}
            label="Mapa para seleccionar la ubicación de la propiedad"
            onMapClick={updateCoordinates}
            onPointDrag={(_, point) => updateCoordinates(point)}
            points={selectedPoint}
            zoom={latitude !== null && longitude !== null ? 15 : 11}
          />
          <label>Latitud
            <input max="90" min="-90" onChange={(event) => setLatitude(event.target.value ? Number(event.target.value) : null)} placeholder="19.4326" step="any" type="number" value={latitude ?? ""} />
          </label>
          <label>Longitud
            <input max="180" min="-180" onChange={(event) => setLongitude(event.target.value ? Number(event.target.value) : null)} placeholder="-99.1332" step="any" type="number" value={longitude ?? ""} />
          </label>
          <input name="latitude" type="hidden" value={latitude ?? ""} />
          <input name="longitude" type="hidden" value={longitude ?? ""} />
        </div>
      </div>
      <div className="admin-property-form__footer">
        <button className="button button--primary button--medium" disabled={pending} type="submit">
          {pending ? "Guardando…" : initial.id ? "Guardar cambios" : "Crear borrador"}
        </button>
        <p aria-live="polite" className={`admin-property-feedback admin-property-feedback--${state.status}`} role={state.status === "error" ? "alert" : "status"}>
          {state.message}
        </p>
      </div>
    </form>
  );
}
