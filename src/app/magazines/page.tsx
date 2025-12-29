import { db, magazines, magazineAppearances, media } from "@/lib/db";
import { desc, eq, and } from "drizzle-orm";
import Link from "next/link";

export default async function MagazinesPage() {
  // Get legacy magazines (full scans)
  const legacyMagazines = db
    .select()
    .from(magazines)
    .orderBy(desc(magazines.year), desc(magazines.month))
    .all();

  // Get community-submitted magazines from media table
  const communityMagazines = db
    .select()
    .from(media)
    .where(
      and(
        eq(media.mediaType, "magazine"),
        eq(media.status, "published")
      )
    )
    .all()
    // Filter out those that were migrated from legacy (same ID)
    .filter((m) => !legacyMagazines.some((leg) => leg.id === m.id));

  const allAppearances = db.select().from(magazineAppearances).all();

  // Combine and normalize both sources
  const allMagazines = [
    ...legacyMagazines.map((mag) => ({
      id: mag.id,
      title: mag.title,
      volume: mag.volume,
      issue: mag.issue,
      year: mag.year,
      month: mag.month,
      coverImage: mag.coverImage,
      completeness: "full" as const,
      source: "legacy" as const,
    })),
    ...communityMagazines.map((mag) => ({
      id: mag.id,
      title: mag.title,
      volume: mag.volume,
      issue: mag.issue,
      year: mag.year,
      month: mag.month,
      coverImage: mag.coverImage,
      completeness: mag.completeness as "full" | "metadata",
      source: "community" as const,
    })),
  ].sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year;
    return (b.month || 0) - (a.month || 0);
  });

  const magazinesWithCounts = allMagazines.map((mag) => {
    const appearances = allAppearances.filter((a) => a.magazineId === mag.id);
    const skaterCount = appearances.filter((a) => a.entityType === "skater").length;
    const totalEntities = appearances.length;
    return { ...mag, skaterCount, totalEntities };
  });

  return (
    <div className="min-h-screen bg-white text-[#3a3a3a]">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold tracking-tight">Magazines</h1>
          <p className="mt-1 text-[#666]">{magazinesWithCounts.length} issues indexed</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {magazinesWithCounts.map((mag) => (
            <Link
              key={`${mag.source}-${mag.id}`}
              href={mag.source === "legacy" ? `/magazines/${mag.id}` : `/media/${mag.id}`}
              className="group border border-[#ebebeb] p-4 transition-colors hover:border-[#3a3a3a]"
            >
              <div className="mb-3 aspect-[3/4] bg-[#f6f6f6] flex items-center justify-center overflow-hidden relative">
                {mag.coverImage ? (
                  <img src={mag.coverImage} alt={`${mag.title} cover`} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-4xl">📰</span>
                )}
                {mag.completeness === "metadata" && (
                  <span className="absolute top-2 right-2 bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.5 font-medium">
                    Cover Only
                  </span>
                )}
              </div>
              <h3 className="font-medium">{mag.title}</h3>
              <p className="text-sm text-[#666]">
                {mag.volume && `Vol. ${mag.volume}`}
                {mag.issue && ` #${mag.issue}`}
                {" · "}
                {mag.month && new Date(2000, mag.month - 1).toLocaleString("default", { month: "short" })}{" "}
                {mag.year}
              </p>
              {mag.source === "legacy" ? (
                <p className="mt-1 text-xs text-[#999]">
                  {mag.skaterCount} skaters · {mag.totalEntities} total entities
                </p>
              ) : (
                <p className="mt-1 text-xs text-[#999]">
                  Community submission
                </p>
              )}
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
