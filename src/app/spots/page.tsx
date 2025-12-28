import { db, spots, magazineAppearances } from "@/lib/db";
import Link from "next/link";

export default async function SpotsPage() {
  const allSpots = db.select().from(spots).all();
  const allAppearances = db.select().from(magazineAppearances).all();

  const spotsWithCounts = allSpots.map((spot) => {
    const appearances = allAppearances.filter(
      (a) => a.entityType === "spot" && a.entityId === spot.id
    );
    const totalPages = appearances.reduce((sum, a) => {
      const pages = a.pageNumbers as number[] | null;
      return sum + (pages?.length || 0);
    }, 0);
    return { ...spot, magazineCount: appearances.length, totalPages };
  });

  // Sort alphabetically
  const sortedSpots = spotsWithCounts.sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="min-h-screen bg-white text-[#3a3a3a]">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold tracking-tight">Spots</h1>
          <p className="mt-1 text-[#666]">{sortedSpots.length} spots indexed</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {sortedSpots.map((spot) => (
            <Link
              key={spot.id}
              href={`/spots/${spot.id}`}
              className="flex items-center justify-between border border-[#ebebeb] px-4 py-3 text-[#3a3a3a] transition-colors hover:border-[#3a3a3a]"
            >
              <div>
                <span className="font-medium">{spot.name}</span>
                {spot.city && <span className="ml-2 text-sm text-[#666]">{spot.city}{spot.state && `, ${spot.state}`}</span>}
              </div>
              <span className="text-sm text-[#666]">
                {spot.magazineCount} mag{spot.magazineCount !== 1 && "s"}
              </span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
