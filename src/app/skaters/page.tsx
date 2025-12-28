import { db, skaters, magazineAppearances } from "@/lib/db";
import Link from "next/link";

export default async function SkatersPage() {
  const allSkaters = db.select().from(skaters).all();
  const allAppearances = db.select().from(magazineAppearances).all();

  // Count appearances per skater
  const skatersWithCounts = allSkaters.map((skater) => {
    const appearances = allAppearances.filter(
      (a) => a.entityType === "skater" && a.entityId === skater.id
    );
    const totalPages = appearances.reduce((sum, a) => {
      const pages = a.pageNumbers as number[] | null;
      return sum + (pages?.length || 0);
    }, 0);
    return {
      ...skater,
      magazineCount: appearances.length,
      totalPages,
    };
  });

  // Sort alphabetically
  const sortedSkaters = skatersWithCounts.sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="min-h-screen bg-white text-[#3a3a3a]">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold tracking-tight">Skaters</h1>
          <p className="mt-1 text-[#666]">{sortedSkaters.length} skaters indexed</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {sortedSkaters.map((skater) => (
            <Link
              key={skater.id}
              href={`/skaters/${skater.id}`}
              className="flex items-center justify-between border border-[#ebebeb] px-3 py-2.5 sm:px-4 sm:py-3 transition-colors hover:border-[#3a3a3a]"
            >
              <span className="font-medium text-sm sm:text-base">{skater.name}</span>
              <span className="text-xs sm:text-sm text-[#999] whitespace-nowrap ml-2">
                {skater.magazineCount} mag{skater.magazineCount !== 1 && "s"}
              </span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
