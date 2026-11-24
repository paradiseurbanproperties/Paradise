"use client";

import { useEffect, useRef, useState } from "react";

export type MapPoint = {
  id: string;
  latitude: number;
  longitude: number;
  label: string;
  selected?: boolean;
  draggable?: boolean;
};

type MapCanvasProps = {
  points?: MapPoint[];
  center: { latitude: number; longitude: number };
  zoom?: number;
  radiusMeters?: number;
  label: string;
  onMapClick?: (point: { latitude: number; longitude: number }) => void;
  onPointClick?: (id: string) => void;
  onPointDrag?: (id: string, point: { latitude: number; longitude: number }) => void;
  className?: string;
};

const DEFAULT_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

function getTileUrl(): string {
  const configured = process.env.NEXT_PUBLIC_MAP_TILE_URL?.trim();
  return configured && !configured.includes("<") ? configured : DEFAULT_TILE_URL;
}

function getMapStyleUrl(): string | undefined {
  const configured = process.env.NEXT_PUBLIC_MAP_STYLE_URL?.trim();
  return configured && !configured.includes("<") ? configured : undefined;
}

function circleFeature(latitude: number, longitude: number, radius: number) {
  const earthRadius = 6_371_008.8;
  const angularDistance = radius / earthRadius;
  const latitudeRadians = latitude * (Math.PI / 180);
  const longitudeRadians = longitude * (Math.PI / 180);
  const coordinates: number[][] = [];

  for (let bearing = 0; bearing <= 360; bearing += 6) {
    const bearingRadians = bearing * (Math.PI / 180);
    const destinationLatitude = Math.asin(
      Math.sin(latitudeRadians) * Math.cos(angularDistance) +
      Math.cos(latitudeRadians) * Math.sin(angularDistance) * Math.cos(bearingRadians),
    );
    const destinationLongitude = longitudeRadians + Math.atan2(
      Math.sin(bearingRadians) * Math.sin(angularDistance) * Math.cos(latitudeRadians),
      Math.cos(angularDistance) - Math.sin(latitudeRadians) * Math.sin(destinationLatitude),
    );
    coordinates.push([destinationLongitude * (180 / Math.PI), destinationLatitude * (180 / Math.PI)]);
  }

  return {
    type: "Feature",
    properties: {},
    geometry: { type: "Polygon", coordinates: [coordinates] },
  };
}

export function MapCanvas({
  points = [],
  center,
  zoom = 12,
  radiusMeters,
  label,
  onMapClick,
  onPointClick,
  onPointDrag,
  className,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  const maplibreRef = useRef<typeof import("maplibre-gl") | null>(null);
  const markersRef = useRef<import("maplibre-gl").Marker[]>([]);
  const callbacksRef = useRef({ onMapClick, onPointClick, onPointDrag });
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    callbacksRef.current = { onMapClick, onPointClick, onPointDrag };
  }, [onMapClick, onPointClick, onPointDrag]);

  useEffect(() => {
    let disposed = false;
    let map: import("maplibre-gl").Map | null = null;
    void import("maplibre-gl").then((maplibre) => {
      if (disposed || !containerRef.current) return;

      maplibre.setWorkerUrl(
        new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).toString(),
      );
      map = new maplibre.Map({
        container: containerRef.current,
        center: [center.longitude, center.latitude],
        zoom,
        // Keep one-finger pan enabled on touch screens. Cooperative gestures
        // blocks it and asks mobile users to use two fingers instead.
        cooperativeGestures: false,
        style: getMapStyleUrl() ?? {
          version: 8,
          sources: {
            openstreetmap: {
              type: "raster",
              tiles: [getTileUrl()],
              tileSize: 256,
              attribution: "© <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap contributors</a>",
            },
          },
          layers: [{ id: "openstreetmap-raster", type: "raster", source: "openstreetmap" }],
        },
      });
      map.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");
      map.on("load", () => {
        if (!disposed) {
          if (radiusMeters !== undefined) {
            const tint = getComputedStyle(document.documentElement).getPropertyValue("--color-blue").trim();
            const emptyCircle = circleFeature(center.latitude, center.longitude, radiusMeters);
            map?.addSource("search-radius", { type: "geojson", data: emptyCircle });
            map?.addLayer({
              id: "search-radius-fill",
              type: "fill",
              source: "search-radius",
              paint: { "fill-color": tint, "fill-opacity": 0.12 },
            });
            map?.addLayer({
              id: "search-radius-outline",
              type: "line",
              source: "search-radius",
              paint: { "line-color": tint, "line-width": 2, "line-opacity": 0.75 },
            });
          }
          maplibreRef.current = maplibre;
          setReady(true);
        }
      });
      map.on("error", () => {
        if (!disposed) setError(true);
      });
      map.on("click", (event) => {
        callbacksRef.current.onMapClick?.({
          latitude: event.lngLat.lat,
          longitude: event.lngLat.lng,
        });
      });

      mapRef.current = map;
    }).catch(() => {
      if (!disposed) setError(true);
    });

    return () => {
      disposed = true;
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      map?.remove();
      mapRef.current = null;
      maplibreRef.current = null;
    };
    // The map instance is intentionally created once; camera and markers update below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.easeTo({ center: [center.longitude, center.latitude], duration: 350 });
    const source = map.getSource("search-radius") as { setData?: (data: unknown) => void } | undefined;
    if (radiusMeters !== undefined) {
      source?.setData?.(circleFeature(center.latitude, center.longitude, radiusMeters));
    }
  }, [center.latitude, center.longitude, radiusMeters]);

  useEffect(() => {
    const map = mapRef.current;
    const maplibre = maplibreRef.current;
    if (!map || !maplibre || !ready) return;
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = points.map((point) => {
      const isInteractive = Boolean(point.draggable || callbacksRef.current.onPointClick);
      const element = document.createElement(isInteractive ? "button" : "div");
      if (element instanceof HTMLButtonElement) element.type = "button";
      element.className = point.selected ? "map-marker map-marker--selected" : "map-marker";
      element.setAttribute("aria-label", point.label);
      if (!isInteractive) element.setAttribute("role", "img");
      element.title = point.label;
      if (callbacksRef.current.onPointClick) {
        element.addEventListener("click", (event) => {
          event.stopPropagation();
          callbacksRef.current.onPointClick?.(point.id);
        });
      }

      const marker = new maplibre.Marker({ element, anchor: "bottom", draggable: point.draggable })
        .setLngLat([point.longitude, point.latitude])
        .addTo(map);
      if (point.draggable) {
        marker.on("dragend", () => {
          const position = marker.getLngLat();
          callbacksRef.current.onPointDrag?.(point.id, {
            latitude: position.lat,
            longitude: position.lng,
          });
        });
      }
      return marker;
    });
  }, [points, ready]);

  return (
    <div className={`map-canvas ${className ?? ""}`}>
      <div aria-label={label} className="map-canvas__surface" ref={containerRef} role="application" />
      {!ready && !error ? <p className="map-canvas__status" role="status">Cargando mapa…</p> : null}
      {error ? <p className="map-canvas__status map-canvas__status--error" role="status">No se pudo cargar el mapa. Revisa tu conexión e inténtalo de nuevo.</p> : null}
      {ready && !error ? <p className="map-canvas__mobile-hint" aria-hidden="true">Arrastra para mover · Pellizca para acercar</p> : null}
    </div>
  );
}
