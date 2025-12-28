"use client";

import dynamic from "next/dynamic";

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

// Dynamic import to avoid SSR issues with Leaflet
const LocationMap = dynamic(
  () => import("@/components/location-map").then((mod) => mod.LocationMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-[#f6f6f6]">
        <span className="text-[#999]">Loading map...</span>
      </div>
    ),
  }
);

interface MapWrapperProps {
  locations: LocationMarker[];
  focusKey?: string; // e.g. "spot-123" or "location-456"
}

export function MapWrapper({ locations, focusKey }: MapWrapperProps) {
  return (
    <>
      {/* Import Leaflet CSS */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
        crossOrigin=""
      />
      <LocationMap locations={locations} focusKey={focusKey} />
    </>
  );
}
