"use client";

import { useMemo } from "react";
import type { LatLngBoundsExpression } from "leaflet";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  ZoomControl,
} from "react-leaflet";
import {
  BIOSECURITY_MAP_BOUNDS,
  BIOSECURITY_MAP_CENTER,
  BIOSECURITY_MAP_MAX_ZOOM,
  BIOSECURITY_MAP_MIN_ZOOM,
  BIOSECURITY_MAP_ZOOM,
  BIOSECURITY_MARKERS,
} from "@/lib/constants/biosecurity-map";

export function BiosecurityLeafletMap() {
  const bounds = useMemo(
    () => BIOSECURITY_MAP_BOUNDS as LatLngBoundsExpression,
    [],
  );

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <MapContainer
        center={BIOSECURITY_MAP_CENTER}
        zoom={BIOSECURITY_MAP_ZOOM}
        minZoom={BIOSECURITY_MAP_MIN_ZOOM}
        maxZoom={BIOSECURITY_MAP_MAX_ZOOM}
        maxBounds={bounds}
        maxBoundsViscosity={0.9}
        zoomControl={false}
        className="h-[460px] w-full"
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        <ZoomControl position="bottomright" />
        {BIOSECURITY_MARKERS.map((marker) => {
          const isInfected = marker.type === "infected";
          return (
            <CircleMarker
              key={marker.id}
              center={marker.position}
              radius={isInfected ? 13 : 10}
              pathOptions={{
                color: isInfected ? "#dc2626" : "#f97316",
                fillColor: isInfected ? "#ef4444" : "#fb923c",
                fillOpacity: 0.65,
                weight: 2,
              }}
            >
              <Popup>
                <p className="font-semibold">{marker.label}</p>
                <p className="mt-1 text-sm">{marker.detail}</p>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      <div className="pointer-events-none absolute left-4 top-4 w-[240px] rounded-2xl border border-slate-200 bg-white/95 p-3 text-xs shadow-sm dark:border-slate-700 dark:bg-slate-950/85">
        <p className="font-semibold text-slate-800 dark:text-slate-100">
          FMD Biosecurity Monitor
        </p>
        <p className="mt-1 text-slate-500 dark:text-slate-300">
          Zoom and inspect affected livestock zones and high-risk corridors.
        </p>
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
            <span className="text-slate-700 dark:text-slate-200">
              Infected areas
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-orange-400" />
            <span className="text-slate-700 dark:text-slate-200">
              High-risk zones
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
