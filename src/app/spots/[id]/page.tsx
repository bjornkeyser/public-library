import { db, spots, magazineAppearances, magazines, locations, trickMentions, tricks, skaters } from "@/lib/db";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { EntityTimeline } from "@/components/entity-timeline";
import { BackButton } from "@/components/back-button";

type Props = { params: Promise<{ id: string }> };

export default async function SpotDetailPage({ params }: Props) {
  const { id } = await params;
  const spotId = parseInt(id, 10);

  const spot = db.select().from(spots).where(eq(spots.id, spotId)).get();
  if (!spot) notFound();

  // Fetch linked location for address details
  const linkedLocation = spot.locationId
    ? db.select().from(locations).where(eq(locations.id, spot.locationId)).get()
    : null;

  const appearances = db
    .select()
    .from(magazineAppearances)
    .where(eq(magazineAppearances.entityId, spotId))
    .all()
    .filter((a) => a.entityType === "spot");

  // Get trick mentions at this spot
  const mentions = db
    .select()
    .from(trickMentions)
    .where(eq(trickMentions.spotId, spotId))
    .all();

  const allTricks = db.select().from(tricks).all();
  const allSkaters = db.select().from(skaters).all();
  const allMagazines = db.select().from(magazines).all();

  // Group by trick
  const trickCounts = new Map<number, { trick: typeof allTricks[0], count: number, skaters: string[] }>();
  mentions.forEach((m) => {
    const existing = trickCounts.get(m.trickId);
    const skater = m.skaterId ? allSkaters.find((s) => s.id === m.skaterId)?.name : null;
    if (existing) {
      existing.count++;
      if (skater && !existing.skaters.includes(skater)) existing.skaters.push(skater);
    } else {
      const trick = allTricks.find((t) => t.id === m.trickId);
      if (trick) {
        trickCounts.set(m.trickId, { trick, count: 1, skaters: skater ? [skater] : [] });
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
  const locationStr = [spot.city, spot.state, spot.country !== "USA" ? spot.country : null].filter(Boolean).join(", ");

  // Get year range
  const years = magazineAppearancesList.map((a) => a.magazine!.year);
  const minYear = years.length > 0 ? Math.min(...years) : null;
  const maxYear = years.length > 0 ? Math.max(...years) : null;

  // Build details list - prefer linked location data, fall back to spot data
  const details: { label: string; value: string }[] = [];
  if (spot.type) details.push({ label: "Type", value: spot.type });
  if (spot.status) details.push({ label: "Status", value: spot.status });

  // Address from linked location
  if (linkedLocation?.streetNumber && linkedLocation?.streetName) {
    details.push({ label: "Address", value: `${linkedLocation.streetNumber} ${linkedLocation.streetName}` });
  } else if (linkedLocation?.address) {
    details.push({ label: "Address", value: linkedLocation.address });
  } else if (linkedLocation?.streetName) {
    details.push({ label: "Street", value: linkedLocation.streetName });
  }

  // City - prefer linked location
  const city = linkedLocation?.city || spot.city;
  if (city) details.push({ label: "City", value: city });

  // State - prefer linked location
  const state = linkedLocation?.state || spot.state;
  if (state) details.push({ label: "State", value: state });

  // Zipcode from linked location
  if (linkedLocation?.zipcode) details.push({ label: "Zipcode", value: linkedLocation.zipcode });

  // Country
  const country = linkedLocation?.country || spot.country;
  if (country && country !== "USA") details.push({ label: "Country", value: country });

  // Phone
  if (spot.phone) details.push({ label: "Phone", value: spot.phone });

  // Coordinates - prefer spot coords, fall back to location coords
  const lat = spot.latitude || linkedLocation?.latitude;
  const lng = spot.longitude || linkedLocation?.longitude;
  if (lat && lng) {
    details.push({ label: "Coordinates", value: `${lat.toFixed(4)}, ${lng.toFixed(4)}` });
  }

  const hasCoords = lat && lng;

  return (
    <div className="min-h-screen bg-white text-[#3a3a3a]">
      <header className="border-b border-[#ebebeb]">
        <div className="container mx-auto px-4 py-6">
          <BackButton fallbackHref="/spots" fallbackLabel="All Spots" />
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{spot.name}</h1>
          <p className="mt-1 text-[#666]">
            {locationStr && <>{locationStr} · </>}
            {spot.type && <>{spot.type} · </>}
            {magazineAppearancesList.length} magazine{magazineAppearancesList.length !== 1 && "s"} · {totalPages} page{totalPages !== 1 && "s"}
            {minYear && maxYear && (
              <span className="ml-1">
                · {minYear === maxYear ? minYear : `${minYear}–${maxYear}`}
              </span>
            )}
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Details Section */}
        {(details.length > 0 || hasCoords) && (
          <section className="mb-8">
            <h2 className="mb-4 text-lg font-semibold uppercase tracking-wide">Details</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {details.map((detail) => (
                <div key={detail.label} className="border border-[#ebebeb] px-4 py-3">
                  <span className="text-xs uppercase tracking-wide text-[#999]">{detail.label}</span>
                  <div className="font-medium">{detail.value}</div>
                </div>
              ))}
              {hasCoords && (
                <Link
                  href={`/map?focus=spot-${spot.id}`}
                  className="border border-[#ebebeb] px-4 py-3 hover:border-[#3a3a3a] transition-colors"
                >
                  <span className="text-xs uppercase tracking-wide text-[#999]">Map</span>
                  <div className="font-medium">View on Map →</div>
                </Link>
              )}
            </div>

            {/* Mini map preview */}
            {hasCoords && (
              <div className="mt-4">
                <Link
                  href={`/map?focus=spot-${spot.id}`}
                  className="block border border-[#ebebeb] hover:border-[#3a3a3a] transition-colors overflow-hidden bg-[#f6f6f6] h-[120px] flex items-center justify-center"
                >
                  <div className="text-center">
                    <div className="text-sm font-medium text-[#3a3a3a]">View on Interactive Map →</div>
                    <div className="text-xs text-[#999] mt-1">{lat!.toFixed(4)}, {lng!.toFixed(4)}</div>
                  </div>
                </Link>
              </div>
            )}
          </section>
        )}

        <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
          <section>
            <h2 className="mb-6 text-lg font-semibold uppercase tracking-wide">Timeline</h2>
            <EntityTimeline items={magazineAppearancesList} entityName={spot.name} entityType="spot" entityId={spotId} />
          </section>

          {/* Sidebar: Tricks done here */}
          {sortedTrickCounts.length > 0 && (
            <div>
              <section>
                <h2 className="mb-4 text-lg font-semibold uppercase tracking-wide">Tricks Done Here</h2>
                <div className="space-y-2">
                  {sortedTrickCounts.map(({ trick, count, skaters: skaterNames }) => (
                    <Link
                      key={trick.id}
                      href={`/tricks/${trick.id}`}
                      className="block border border-[#ebebeb] px-3 py-2 hover:border-[#3a3a3a] transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{trick.name}</span>
                        <span className="text-xs text-[#999]">{count}x</span>
                      </div>
                      {skaterNames.length > 0 && (
                        <div className="text-xs text-[#666] mt-0.5">
                          by {skaterNames.slice(0, 2).join(", ")}{skaterNames.length > 2 && ` +${skaterNames.length - 2} more`}
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
