import { db, locations, magazineAppearances } from "@/lib/db";
import Link from "next/link";

export default async function LocationsPage() {
  const allLocations = db.select().from(locations).all();
  const allAppearances = db.select().from(magazineAppearances).all();

  // Count appearances per location
  const locationsWithCounts = allLocations.map((location) => {
    const appearances = allAppearances.filter(
      (a) => a.entityType === "location" && a.entityId === location.id
    );
    const totalPages = appearances.reduce((sum, a) => {
      const pages = a.pageNumbers as number[] | null;
      return sum + (pages?.length || 0);
    }, 0);
    return {
      ...location,
      magazineCount: appearances.length,
      totalPages,
    };
  });

  // Sort alphabetically
  const sortedLocations = locationsWithCounts.sort((a, b) => a.name.localeCompare(b.name));

  // Group by type for better organization
  const locationsByType = sortedLocations.reduce((acc, loc) => {
    const type = loc.type || "other";
    if (!acc[type]) acc[type] = [];
    acc[type].push(loc);
    return acc;
  }, {} as Record<string, typeof sortedLocations>);

  const typeOrder = ["city", "state", "country", "neighborhood", "street", "address", "zipcode", "region", "other"];
  const sortedTypes = typeOrder.filter((t) => locationsByType[t]?.length > 0);

  return (
    <div className="min-h-screen bg-white text-[#3a3a3a]">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold tracking-tight">Locations</h1>
          <p className="mt-1 text-[#666]">{sortedLocations.length} locations indexed</p>
        </div>

        {sortedTypes.map((type) => (
          <section key={type} className="mb-8">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[#999]">
              {type === "other" ? "Other Locations" : type.charAt(0).toUpperCase() + type.slice(1) + "s"}
              <span className="ml-2 font-normal">({locationsByType[type].length})</span>
            </h2>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {locationsByType[type].map((location) => (
                <Link
                  key={location.id}
                  href={`/locations/${location.id}`}
                  className="flex items-center justify-between border border-[#ebebeb] px-4 py-3 transition-colors hover:border-[#3a3a3a]"
                >
                  <div>
                    <span className="font-medium">{location.name}</span>
                    {(location.city || location.state) && (
                      <span className="ml-2 text-sm text-[#999]">
                        {[location.city, location.state].filter(Boolean).join(", ")}
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-[#999]">
                    {location.magazineCount} mag{location.magazineCount !== 1 && "s"} · {location.totalPages} pg{location.totalPages !== 1 && "s"}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
