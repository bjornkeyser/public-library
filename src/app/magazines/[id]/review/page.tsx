import { db, magazines, magazineAppearances, skaters, spots, photographers, brands, tricks, events, locations } from "@/lib/db";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ReviewSection } from "./review-section";
import { BulkActions } from "./bulk-actions";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ReviewPage({ params }: Props) {
  const { id } = await params;
  const magazineId = parseInt(id, 10);

  // Get magazine
  const magazine = db
    .select()
    .from(magazines)
    .where(eq(magazines.id, magazineId))
    .get();

  if (!magazine) {
    notFound();
  }

  // Get all appearances for this magazine
  const appearances = db
    .select()
    .from(magazineAppearances)
    .where(eq(magazineAppearances.magazineId, magazineId))
    .all();

  // Get all entities
  const allSkaters = db.select().from(skaters).all();
  const allSpots = db.select().from(spots).all();
  const allPhotographers = db.select().from(photographers).all();
  const allBrands = db.select().from(brands).all();
  const allTricks = db.select().from(tricks).all();
  const allEvents = db.select().from(events).all();
  const allLocations = db.select().from(locations).all();

  // Group appearances by type with entity details
  const groupedAppearances = {
    skater: appearances
      .filter((a) => a.entityType === "skater")
      .map((a) => ({
        ...a,
        entity: allSkaters.find((s) => s.id === a.entityId),
      }))
      .filter((a) => a.entity)
      .sort((a, b) => (a.verified === b.verified ? 0 : a.verified ? 1 : -1)),
    spot: appearances
      .filter((a) => a.entityType === "spot")
      .map((a) => ({
        ...a,
        entity: allSpots.find((s) => s.id === a.entityId),
      }))
      .filter((a) => a.entity)
      .sort((a, b) => (a.verified === b.verified ? 0 : a.verified ? 1 : -1)),
    photographer: appearances
      .filter((a) => a.entityType === "photographer")
      .map((a) => ({
        ...a,
        entity: allPhotographers.find((p) => p.id === a.entityId),
      }))
      .filter((a) => a.entity)
      .sort((a, b) => (a.verified === b.verified ? 0 : a.verified ? 1 : -1)),
    brand: appearances
      .filter((a) => a.entityType === "brand")
      .map((a) => ({
        ...a,
        entity: allBrands.find((b) => b.id === a.entityId),
      }))
      .filter((a) => a.entity)
      .sort((a, b) => (a.verified === b.verified ? 0 : a.verified ? 1 : -1)),
    trick: appearances
      .filter((a) => a.entityType === "trick")
      .map((a) => ({
        ...a,
        entity: allTricks.find((t) => t.id === a.entityId),
      }))
      .filter((a) => a.entity)
      .sort((a, b) => (a.verified === b.verified ? 0 : a.verified ? 1 : -1)),
    event: appearances
      .filter((a) => a.entityType === "event")
      .map((a) => ({
        ...a,
        entity: allEvents.find((e) => e.id === a.entityId),
      }))
      .filter((a) => a.entity)
      .sort((a, b) => (a.verified === b.verified ? 0 : a.verified ? 1 : -1)),
    location: appearances
      .filter((a) => a.entityType === "location")
      .map((a) => ({
        ...a,
        entity: allLocations.find((l) => l.id === a.entityId),
      }))
      .filter((a) => a.entity)
      .sort((a, b) => (a.verified === b.verified ? 0 : a.verified ? 1 : -1)),
  };

  const unverifiedCount = appearances.filter((a) => !a.verified).length;
  const verifiedCount = appearances.filter((a) => a.verified).length;

  return (
    <div className="min-h-screen bg-white text-[#3a3a3a]">
      {/* Header */}
      <header className="border-b border-[#ebebeb]">
        <div className="container mx-auto px-4 py-6">
          <Link href={`/magazines/${magazineId}`} className="text-sm text-[#999] hover:text-[#3a3a3a]">
            ← Back to {magazine.title}
          </Link>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Review Extractions
          </h1>
          <p className="mt-1 text-[#666]">
            {magazine.title} Vol.{magazine.volume} #{magazine.issue} ({magazine.year})
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats bar */}
        <div className="mb-8 flex items-center gap-6 border border-[#ebebeb] p-4">
          <div>
            <span className="text-2xl font-semibold">{unverifiedCount}</span>
            <span className="ml-2 text-[#666]">unverified</span>
          </div>
          <div>
            <span className="text-2xl font-semibold text-green-600">{verifiedCount}</span>
            <span className="ml-2 text-[#666]">verified</span>
          </div>
          <div className="flex-1" />
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm ${
            magazine.status === "published" ? "bg-green-100 text-green-800" :
            magazine.status === "review" ? "bg-amber-100 text-amber-800" :
            "bg-[#f6f6f6] text-[#666]"
          }`}>
            {magazine.status}
          </span>
          <BulkActions
            magazineId={magazineId}
            currentStatus={magazine.status}
            unverifiedCount={unverifiedCount}
          />
        </div>

        {/* Review sections */}
        <div className="space-y-8">
          <ReviewSection
            title="Skaters"
            entityType="skater"
            appearances={groupedAppearances.skater}
            magazineId={magazineId}
          />
          <ReviewSection
            title="Photographers"
            entityType="photographer"
            appearances={groupedAppearances.photographer}
            magazineId={magazineId}
          />
          <ReviewSection
            title="Spots"
            entityType="spot"
            appearances={groupedAppearances.spot}
            magazineId={magazineId}
          />
          <ReviewSection
            title="Brands"
            entityType="brand"
            appearances={groupedAppearances.brand}
            magazineId={magazineId}
          />
          <ReviewSection
            title="Tricks"
            entityType="trick"
            appearances={groupedAppearances.trick}
            magazineId={magazineId}
          />
          <ReviewSection
            title="Events"
            entityType="event"
            appearances={groupedAppearances.event}
            magazineId={magazineId}
          />
          <ReviewSection
            title="Locations"
            entityType="location"
            appearances={groupedAppearances.location}
            magazineId={magazineId}
          />
        </div>
      </main>
    </div>
  );
}
