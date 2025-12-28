"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface LocationMarker {
  id: number;
  name: string;
  type: string | null;
  city: string | null;
  state: string | null;
  latitude: number;
  longitude: number;
  magazineCount: number;
  totalPages: number;
  entityType: "location" | "spot";
}

interface LocationMapProps {
  locations: LocationMarker[];
  focusKey?: string; // e.g. "spot-123" or "location-456"
}

export function LocationMap({ locations, focusKey }: LocationMapProps) {
  const [mapReady, setMapReady] = useState(false);
  const [MapComponents, setMapComponents] = useState<any>(null);

  useEffect(() => {
    // Dynamic import of Leaflet components (they require window)
    Promise.all([
      import("react-leaflet"),
      import("leaflet"),
    ]).then(([reactLeaflet, L]) => {
      // Fix default marker icons
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      // Create highlighted icon (gold/yellow color)
      const highlightIcon = new L.Icon({
        iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });

      setMapComponents({
        MapContainer: reactLeaflet.MapContainer,
        TileLayer: reactLeaflet.TileLayer,
        Marker: reactLeaflet.Marker,
        Popup: reactLeaflet.Popup,
        highlightIcon,
        L,
      });
      setMapReady(true);
    });
  }, []);

  if (!mapReady || !MapComponents) {
    return (
      <div className="flex h-full items-center justify-center bg-[#f6f6f6]">
        <span className="text-[#999]">Loading map...</span>
      </div>
    );
  }

  const { MapContainer, TileLayer, Marker, Popup, highlightIcon } = MapComponents;

  // Calculate center from locations or default to US center
  const validLocations = locations.filter((l) => l.latitude && l.longitude);

  // Find focused location if specified
  const focusedLocation = focusKey
    ? validLocations.find((l) => `${l.entityType}-${l.id}` === focusKey)
    : null;

  // Center on focused location, or average of all, or US center
  const center: [number, number] = focusedLocation
    ? [focusedLocation.latitude, focusedLocation.longitude]
    : validLocations.length > 0
    ? [
        validLocations.reduce((sum, l) => sum + l.latitude, 0) / validLocations.length,
        validLocations.reduce((sum, l) => sum + l.longitude, 0) / validLocations.length,
      ]
    : [39.8283, -98.5795]; // US center

  // Zoom in more if focused on a specific location
  const zoom = focusedLocation ? 12 : validLocations.length > 0 ? 5 : 4;

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {validLocations.map((location) => {
        const href = location.entityType === "spot"
          ? `/spots/${location.id}`
          : `/locations/${location.id}`;
        const typeLabel = location.entityType === "spot" ? "Spot" : "Location";
        const markerKey = `${location.entityType}-${location.id}`;
        const isFocused = markerKey === focusKey;

        return (
          <Marker
            key={markerKey}
            position={[location.latitude, location.longitude]}
            {...(isFocused && highlightIcon ? { icon: highlightIcon } : {})}
          >
            <Popup>
              <div className="min-w-[180px]">
                {isFocused && (
                  <div className="text-[10px] uppercase tracking-wide text-amber-600 font-semibold mb-1">
                    ★ Focused
                  </div>
                )}
                <div className="text-[10px] uppercase tracking-wide text-[#999] mb-0.5">
                  {typeLabel}
                </div>
                <Link
                  href={href}
                  className="font-medium text-[#3a3a3a] hover:underline"
                >
                  {location.name}
                </Link>
                {(location.city || location.state) && (
                  <div className="text-xs text-[#666]">
                    {[location.city, location.state].filter(Boolean).join(", ")}
                  </div>
                )}
                <div className="mt-1 text-xs text-[#999]">
                  {location.magazineCount} magazine{location.magazineCount !== 1 && "s"} · {location.totalPages} page{location.totalPages !== 1 && "s"}
                </div>
                <Link
                  href={href}
                  className="mt-2 inline-block text-xs border border-[#3a3a3a] px-2 py-1 hover:bg-[#3a3a3a] hover:text-white transition-colors"
                >
                  View Details →
                </Link>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
