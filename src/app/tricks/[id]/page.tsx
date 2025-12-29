import { db, tricks, magazineAppearances, magazines, trickMentions, skaters, spots } from "@/lib/db";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { EntityTimeline } from "@/components/entity-timeline";
import { BackButton } from "@/components/back-button";

type Props = { params: Promise<{ id: string }> };

export default async function TrickDetailPage({ params }: Props) {
  const { id } = await params;
  const trickId = parseInt(id, 10);

  const trick = db.select().from(tricks).where(eq(tricks.id, trickId)).get();
  if (!trick) notFound();

  const appearances = db
    .select()
    .from(magazineAppearances)
    .where(eq(magazineAppearances.entityId, trickId))
    .all()
    .filter((a) => a.entityType === "trick");

  // Get trick mentions - who did this trick and where
  const mentions = db
    .select()
    .from(trickMentions)
    .where(eq(trickMentions.trickId, trickId))
    .all();

  const allSkaters = db.select().from(skaters).all();
  const allSpots = db.select().from(spots).all();
  const allMagazines = db.select().from(magazines).all();

  // Group by skater
  const skaterMentions = new Map<number, { skater: typeof allSkaters[0], count: number, spots: string[] }>();
  mentions.forEach((m) => {
    if (m.skaterId) {
      const existing = skaterMentions.get(m.skaterId);
      const spot = m.spotId ? allSpots.find((s) => s.id === m.spotId)?.name : null;
      if (existing) {
        existing.count++;
        if (spot && !existing.spots.includes(spot)) existing.spots.push(spot);
      } else {
        const skater = allSkaters.find((s) => s.id === m.skaterId);
        if (skater) {
          skaterMentions.set(m.skaterId, { skater, count: 1, spots: spot ? [spot] : [] });
        }
      }
    }
  });

  // Group by spot
  const spotMentions = new Map<number, { spot: typeof allSpots[0], count: number }>();
  mentions.forEach((m) => {
    if (m.spotId) {
      const existing = spotMentions.get(m.spotId);
      if (existing) {
        existing.count++;
      } else {
        const spot = allSpots.find((s) => s.id === m.spotId);
        if (spot) {
          spotMentions.set(m.spotId, { spot, count: 1 });
        }
      }
    }
  });

  const sortedSkaterMentions = Array.from(skaterMentions.values()).sort((a, b) => b.count - a.count);
  const sortedSpotMentions = Array.from(spotMentions.values()).sort((a, b) => b.count - a.count);

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
          <BackButton fallbackHref="/tricks" fallbackLabel="All Tricks" />
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{trick.name}</h1>
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
              <EntityTimeline items={magazineAppearancesList} entityName={trick.name} entityType="trick" entityId={trickId} />
            </section>
          </div>

          {/* Sidebar: Who did this trick */}
          <div className="space-y-8">
            {sortedSkaterMentions.length > 0 && (
              <section>
                <h2 className="mb-4 text-lg font-semibold uppercase tracking-wide">Performed By</h2>
                <div className="space-y-2">
                  {sortedSkaterMentions.map(({ skater, count, spots }) => (
                    <Link
                      key={skater.id}
                      href={`/skaters/${skater.id}`}
                      className="block border border-[#ebebeb] px-3 py-2 hover:border-[#3a3a3a] transition-colors"
                    >
                      <div className="font-medium">{skater.name}</div>
                      {spots.length > 0 && (
                        <div className="text-xs text-[#666] mt-0.5">
                          at {spots.slice(0, 2).join(", ")}{spots.length > 2 && ` +${spots.length - 2} more`}
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {sortedSpotMentions.length > 0 && (
              <section>
                <h2 className="mb-4 text-lg font-semibold uppercase tracking-wide">At Spots</h2>
                <div className="space-y-2">
                  {sortedSpotMentions.map(({ spot, count }) => (
                    <Link
                      key={spot.id}
                      href={`/spots/${spot.id}`}
                      className="flex items-center justify-between border border-[#ebebeb] px-3 py-2 hover:border-[#3a3a3a] transition-colors"
                    >
                      <span className="font-medium">{spot.name}</span>
                      <span className="text-xs text-[#999]">{count}x</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
