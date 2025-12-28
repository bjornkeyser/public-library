"use client";

import { useState, useTransition } from "react";
import { geocodeAllLocations } from "@/lib/actions/admin";

interface GeocodeButtonProps {
  locationCount: number;
  spotCount: number;
}

export function GeocodeButton({ locationCount, spotCount }: GeocodeButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    geocodedLocations: number;
    geocodedSpots: number;
    failed: number;
  } | null>(null);

  const total = locationCount + spotCount;

  if (total === 0) {
    return (
      <div className="text-sm text-[#999]">
        All locations have coordinates
      </div>
    );
  }

  const handleGeocode = () => {
    setResult(null);
    startTransition(async () => {
      const res = await geocodeAllLocations();
      if (res.success) {
        setResult({
          geocodedLocations: res.geocodedLocations,
          geocodedSpots: res.geocodedSpots,
          failed: res.failed,
        });
      }
    });
  };

  return (
    <div className="flex items-center gap-4">
      <button
        onClick={handleGeocode}
        disabled={isPending}
        className="border border-[#3a3a3a] px-4 py-2 text-sm font-medium hover:bg-[#3a3a3a] hover:text-white transition-colors disabled:opacity-50"
      >
        {isPending ? "Geocoding..." : `Geocode ${total} Location${total !== 1 ? "s" : ""}`}
      </button>

      {isPending && (
        <span className="text-sm text-[#666]">
          This may take a while (1 request/second rate limit)
        </span>
      )}

      {result && (
        <span className="text-sm text-green-600">
          Done! {result.geocodedLocations + result.geocodedSpots} geocoded, {result.failed} failed
        </span>
      )}
    </div>
  );
}
