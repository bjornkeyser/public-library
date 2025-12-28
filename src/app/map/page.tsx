import { db, locations, magazineAppearances, spots } from "@/lib/db";
import Link from "next/link";
import { MapWrapper } from "@/components/map-wrapper";

type Props = {
  searchParams: Promise<{ focus?: string }>;
};

export default async function MapPage({ searchParams }: Props) {
  const { focus } = await searchParams;
  const allLocations = db.select().from(locations).all();
  const allSpots = db.select().from(spots).all();
  const allAppearances = db.select().from(magazineAppearances).all();

  // Process locations with coordinates
  const locationsWithCoords = allLocations
    .filter((l) => l.latitude && l.longitude)
    .map((location) => {
      const appearances = allAppearances.filter(
        (a) => a.entityType === "location" && a.entityId === location.id
      );
      const totalPages = appearances.reduce((sum, a) => {
        const pages = a.pageNumbers as number[] | null;
        return sum + (pages?.length || 0);
      }, 0);
      return {
        id: location.id,
        name: location.name,
        type: location.type,
        city: location.city,
        state: location.state,
        latitude: location.latitude!,
        longitude: location.longitude!,
        magazineCount: appearances.length,
        totalPages,
        entityType: "location" as const,
      };
    });

  // Process spots with coordinates
  const spotsWithCoords = allSpots
    .filter((s) => s.latitude && s.longitude)
    .map((spot) => {
      const appearances = allAppearances.filter(
        (a) => a.entityType === "spot" && a.entityId === spot.id
      );
      const totalPages = appearances.reduce((sum, a) => {
        const pages = a.pageNumbers as number[] | null;
        return sum + (pages?.length || 0);
      }, 0);
      return {
        id: spot.id,
        name: spot.name,
        type: spot.type,
        city: spot.city,
        state: spot.state,
        latitude: spot.latitude!,
        longitude: spot.longitude!,
        magazineCount: appearances.length,
        totalPages,
        entityType: "spot" as const,
      };
    });

  // Combine all markers
  const allMarkers = [...locationsWithCoords, ...spotsWithCoords];

  // Stats
  const totalLocations = allLocations.length;
  const totalSpots = allSpots.length;
  const mappedCount = allMarkers.length;
  const unmappedCount = (totalLocations + totalSpots) - mappedCount;

  return (
    <div className="flex h-screen flex-col bg-white text-[#3a3a3a]">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-[#ebebeb]">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div>
            <Link href="/" className="text-sm text-[#999] hover:text-[#3a3a3a]">
              Home
            </Link>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Map View</h1>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-[#666]">
              {mappedCount} mapped location{mappedCount !== 1 && "s"}
            </span>
            {unmappedCount > 0 && (
              <span className="text-[#999]">
                ({unmappedCount} need coordinates)
              </span>
            )}
            <Link
              href="/locations"
              className="border border-[#ebebeb] px-3 py-1.5 hover:border-[#3a3a3a] transition-colors"
            >
              View All Locations
            </Link>
            <Link
              href="/spots"
              className="border border-[#ebebeb] px-3 py-1.5 hover:border-[#3a3a3a] transition-colors"
            >
              View All Spots
            </Link>
          </div>
        </div>
      </header>

      {/* Map */}
      <main className="flex-1 relative">
        {mappedCount === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4">
            <p className="text-lg text-[#666]">No locations with coordinates yet.</p>
            <p className="text-sm text-[#999]">
              Add latitude/longitude to locations or spots to see them on the map.
            </p>
            <Link
              href="/locations"
              className="border border-[#3a3a3a] px-4 py-2 hover:bg-[#3a3a3a] hover:text-white transition-colors"
            >
              Manage Locations
            </Link>
          </div>
        ) : (
          <MapWrapper locations={allMarkers} focusKey={focus} />
        )}
      </main>
    </div>
  );
}
