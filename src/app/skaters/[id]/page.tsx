import { db, skaters, magazineAppearances, magazines, trickMentions, tricks, spots } from "@/lib/db";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { EntityTimeline } from "@/components/entity-timeline";
import { BackButton } from "@/components/back-button";

type Props = { params: Promise<{ id: string }> };

export default async function SkaterDetailPage({ params }: Props) {
  const { id } = await params;
  const skaterId = parseInt(id, 10);

  const skater = db.select().from(skaters).where(eq(skaters.id, skaterId)).get();
  if (!skater) notFound();

  const appearances = db
    .select()
    .from(magazineAppearances)
    .where(eq(magazineAppearances.entityId, skaterId))
    .all()
    .filter((a) => a.entityType === "skater");

  // Get trick mentions for this skater
  const mentions = db
    .select()
    .from(trickMentions)
    .where(eq(trickMentions.skaterId, skaterId))
    .all();

  const allTricks = db.select().from(tricks).all();
  const allSpots = db.select().from(spots).all();
  const allMagazines = db.select().from(magazines).all();

  // Group by trick
  const trickCounts = new Map<number, { trick: typeof allTricks[0], count: number, spots: string[] }>();
  mentions.forEach((m) => {
    const existing = trickCounts.get(m.trickId);
    const spot = m.spotId ? allSpots.find((s) => s.id === m.spotId)?.name : null;
    if (existing) {
      existing.count++;
      if (spot && !existing.spots.includes(spot)) existing.spots.push(spot);
    } else {
      const trick = allTricks.find((t) => t.id === m.trickId);
      if (trick) {
        trickCounts.set(m.trickId, { trick, count: 1, spots: spot ? [spot] : [] });
      }
    }
  });

  const sortedTrickCounts = Array.from(trickCounts.values()).sort((a, b) => b.count - a.count);

  const magazineAppearancesList = appearances.map((a) => {
    const mag = allMagazines.find((m) => m.id === a.magazineId);
    const pageNums = a.pageNumbers as number[] | null;
    return { appearance: a, magazine: mag, pageCount: pageNums?.length || 0 };
  }).filter((a) => a.magazine);

  const totalPages = magazineAppearancesList.reduce((sum, m) => sum + m.pageCount, 0);

  // Get year range
  const years = magazineAppearancesList.map((a) => a.magazine!.year);
  const minYear = years.length > 0 ? Math.min(...years) : null;
  const maxYear = years.length > 0 ? Math.max(...years) : null;

  return (
    <div className="min-h-screen bg-white text-[#3a3a3a]">
      <header className="border-b border-[#ebebeb]">
        <div className="container mx-auto px-4 py-6">
          <BackButton fallbackHref="/skaters" fallbackLabel="All Skaters" />
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{skater.name}</h1>
          <p className="mt-1 text-[#666]">
            {magazineAppearancesList.length} magazine{magazineAppearancesList.length !== 1 && "s"} · {totalPages} page{totalPages !== 1 && "s"}
            {minYear && maxYear && (
              <span className="ml-2">
                · {minYear === maxYear ? minYear : `${minYear}–${maxYear}`}
              </span>
            )}
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
          <div>
            <section>
              <h2 className="mb-6 text-lg font-semibold uppercase tracking-wide">Timeline</h2>
              <EntityTimeline items={magazineAppearancesList} entityName={skater.name} entityType="skater" entityId={skaterId} />
            </section>
          </div>

          {/* Sidebar: Tricks performed */}
          {sortedTrickCounts.length > 0 && (
            <div>
              <section>
                <h2 className="mb-4 text-lg font-semibold uppercase tracking-wide">Tricks</h2>
                <div className="space-y-2">
                  {sortedTrickCounts.map(({ trick, count, spots }) => (
                    <Link
                      key={trick.id}
                      href={`/tricks/${trick.id}`}
                      className="block border border-[#ebebeb] px-3 py-2 hover:border-[#3a3a3a] transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{trick.name}</span>
                        <span className="text-xs text-[#999]">{count}x</span>
                      </div>
                      {spots.length > 0 && (
                        <div className="text-xs text-[#666] mt-0.5">
                          at {spots.slice(0, 2).join(", ")}{spots.length > 2 && ` +${spots.length - 2} more`}
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
