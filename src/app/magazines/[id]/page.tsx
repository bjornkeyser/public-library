import { db, magazines, magazineAppearances, skaters, spots, photographers, brands, events, tricks, magazinePages } from "@/lib/db";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CollapsibleSection } from "@/components/collapsible-section";
import { BackButton } from "@/components/back-button";
import { FlipCover } from "@/components/flip-cover";

type Props = {
  params: Promise<{ id: string }>;
};

// Helper to build entity link with highlighting
function getEntityPageLink(magazineId: number, pageNums: number[], entityType: string, entityId: number, entityName: string): string {
  if (!pageNums || pageNums.length === 0) {
    return `/magazines/${magazineId}/page/1`;
  }

  const sortedPages = [...pageNums].sort((a, b) => a - b);
  const firstPage = sortedPages[0];

  const params = new URLSearchParams();
  params.set("highlight", sortedPages.join(","));
  params.set("entity", entityName);
  params.set("entityType", entityType);
  params.set("entityId", String(entityId));

  return `/magazines/${magazineId}/page/${firstPage}?${params.toString()}`;
}

export default async function MagazineDetailPage({ params }: Props) {
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

  // Get magazine pages
  const pages = db
    .select()
    .from(magazinePages)
    .where(eq(magazinePages.magazineId, magazineId))
    .all();

  // Group appearances by type
  const skaterAppearances = appearances.filter((a) => a.entityType === "skater");
  const spotAppearances = appearances.filter((a) => a.entityType === "spot");
  const photographerAppearances = appearances.filter((a) => a.entityType === "photographer");
  const brandAppearances = appearances.filter((a) => a.entityType === "brand");
  const trickAppearances = appearances.filter((a) => a.entityType === "trick");
  const eventAppearances = appearances.filter((a) => a.entityType === "event");

  // Get entity details
  const skaterIds = skaterAppearances.map((a) => a.entityId);
  const spotIds = spotAppearances.map((a) => a.entityId);
  const photographerIds = photographerAppearances.map((a) => a.entityId);
  const brandIds = brandAppearances.map((a) => a.entityId);
  const trickIds = trickAppearances.map((a) => a.entityId);
  const eventIds = eventAppearances.map((a) => a.entityId);

  const skaterList = skaterIds.length > 0
    ? db.select().from(skaters).all().filter((s) => skaterIds.includes(s.id))
    : [];
  const spotList = spotIds.length > 0
    ? db.select().from(spots).all().filter((s) => spotIds.includes(s.id))
    : [];
  const photographerList = photographerIds.length > 0
    ? db.select().from(photographers).all().filter((p) => photographerIds.includes(p.id))
    : [];
  const brandList = brandIds.length > 0
    ? db.select().from(brands).all().filter((b) => brandIds.includes(b.id))
    : [];
  const trickList = trickIds.length > 0
    ? db.select().from(tricks).all().filter((t) => trickIds.includes(t.id))
    : [];
  const eventList = eventIds.length > 0
    ? db.select().from(events).all().filter((e) => eventIds.includes(e.id))
    : [];

  // Helper to get page count for sorting
  const getPageCount = (entityId: number, appearancesList: typeof appearances) => {
    const app = appearancesList.find((a) => a.entityId === entityId);
    return (app?.pageNumbers as number[] | null)?.length || 0;
  };

  // Sort all lists by number of appearances (descending)
  const sortedSkaters = [...skaterList].sort((a, b) =>
    getPageCount(b.id, skaterAppearances) - getPageCount(a.id, skaterAppearances)
  );
  const sortedSpots = [...spotList].sort((a, b) =>
    getPageCount(b.id, spotAppearances) - getPageCount(a.id, spotAppearances)
  );
  const sortedPhotographers = [...photographerList].sort((a, b) =>
    getPageCount(b.id, photographerAppearances) - getPageCount(a.id, photographerAppearances)
  );
  const sortedBrands = [...brandList].sort((a, b) =>
    getPageCount(b.id, brandAppearances) - getPageCount(a.id, brandAppearances)
  );
  const sortedTricks = [...trickList].sort((a, b) =>
    getPageCount(b.id, trickAppearances) - getPageCount(a.id, trickAppearances)
  );
  const sortedEvents = [...eventList].sort((a, b) =>
    getPageCount(b.id, eventAppearances) - getPageCount(a.id, eventAppearances)
  );

  // Calculate total entities for stats
  const totalEntities = sortedSkaters.length + sortedSpots.length + sortedPhotographers.length +
    sortedBrands.length + sortedTricks.length + sortedEvents.length;

  // Get first page image for flip preview
  const sortedPages = [...pages].sort((a, b) => a.pageNumber - b.pageNumber);
  const firstPage = sortedPages[0];

  return (
    <div className="min-h-screen bg-white text-[#3a3a3a]">
      {/* Header */}
      <header className="border-b border-[#ebebeb]">
        <div className="container mx-auto px-4 py-6">
          <BackButton fallbackHref="/magazines" fallbackLabel="All Magazines" />
          <div className="flex items-center gap-4 mt-2">
            <h1 className="text-3xl font-semibold tracking-tight">
              {magazine.title}
            </h1>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              magazine.status === "published" ? "bg-green-100 text-green-800" :
              magazine.status === "review" ? "bg-amber-100 text-amber-800" :
              magazine.status === "processing" ? "bg-blue-100 text-blue-800" :
              "bg-[#f6f6f6] text-[#666]"
            }`}>
              {magazine.status}
            </span>
          </div>
          <p className="mt-1 text-[#666]">
            {magazine.volume && `Volume ${magazine.volume}`}
            {magazine.issue && ` · Issue ${magazine.issue}`}
            {" · "}
            {magazine.month && new Date(2000, magazine.month - 1).toLocaleString("default", { month: "long" })}{" "}
            {magazine.year}
            {" · "}{pages.length} pages · {totalEntities} entities
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-[340px_1fr]">
          {/* Left column: Cover + Thumbnails */}
          <div className="space-y-6">
            {/* Flip Cover */}
            <FlipCover
              coverImage={magazine.coverImage}
              title={magazine.title}
              magazineId={magazineId}
              firstPageImage={firstPage?.imagePath}
            />

            {/* Page thumbnails - compact grid */}
            {pages.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs uppercase tracking-wide text-[#999]">Pages</span>
                  <Link
                    href={`/magazines/${magazineId}/review`}
                    className="text-xs text-[#666] hover:text-[#3a3a3a] underline underline-offset-2"
                  >
                    Review Extractions
                  </Link>
                </div>
                <div className="grid grid-cols-8 gap-1">
                  {sortedPages.map((page) => (
                    <Link
                      key={page.id}
                      href={`/magazines/${magazineId}/page/${page.pageNumber}`}
                      className="aspect-[3/4] bg-[#f6f6f6] border border-[#ebebeb] hover:border-[#3a3a3a] transition-colors overflow-hidden"
                      title={`Page ${page.pageNumber}`}
                    >
                      {page.imagePath ? (
                        <img
                          src={page.imagePath}
                          alt={`Page ${page.pageNumber}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[8px] text-[#999]">
                          {page.pageNumber}
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right column: Entity sections */}
          <div className="space-y-0">
          {/* Skaters */}
          {sortedSkaters.length > 0 && (
            <CollapsibleSection title="Skaters" count={sortedSkaters.length}>
              <div className="flex flex-wrap gap-2">
                {sortedSkaters.map((skater) => {
                  const appearance = skaterAppearances.find((a) => a.entityId === skater.id);
                  const pageNums = appearance?.pageNumbers as number[] | undefined;
                  return (
                    <Link
                      key={skater.id}
                      href={getEntityPageLink(magazineId, pageNums || [], "skater", skater.id, skater.name)}
                      className="inline-flex items-center gap-2 border border-[#ebebeb] px-3 py-1.5 text-sm hover:border-[#3a3a3a] transition-colors"
                    >
                      <span className="font-medium">{skater.name}</span>
                      {pageNums && pageNums.length > 0 && (
                        <span className="text-xs text-[#999]">p.{pageNums.join(",")}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </CollapsibleSection>
          )}

          {/* Tricks */}
          {sortedTricks.length > 0 && (
            <CollapsibleSection title="Tricks" count={sortedTricks.length}>
              <div className="flex flex-wrap gap-2">
                {sortedTricks.map((trick) => {
                  const appearance = trickAppearances.find((a) => a.entityId === trick.id);
                  const pageNums = appearance?.pageNumbers as number[] | undefined;
                  return (
                    <Link
                      key={trick.id}
                      href={getEntityPageLink(magazineId, pageNums || [], "trick", trick.id, trick.name)}
                      className="inline-flex items-center gap-2 border border-[#ebebeb] px-3 py-1.5 text-sm hover:border-[#3a3a3a] transition-colors"
                    >
                      <span className="font-medium">{trick.name}</span>
                      {pageNums && pageNums.length > 0 && (
                        <span className="text-xs text-[#999]">p.{pageNums.join(",")}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </CollapsibleSection>
          )}

          {/* Spots */}
          {sortedSpots.length > 0 && (
            <CollapsibleSection title="Spots" count={sortedSpots.length}>
              <div className="flex flex-wrap gap-2">
                {sortedSpots.map((spot) => {
                  const appearance = spotAppearances.find((a) => a.entityId === spot.id);
                  const pageNums = appearance?.pageNumbers as number[] | undefined;
                  return (
                    <Link
                      key={spot.id}
                      href={getEntityPageLink(magazineId, pageNums || [], "spot", spot.id, spot.name)}
                      className="inline-flex items-center gap-2 border border-[#ebebeb] px-3 py-1.5 text-sm hover:border-[#3a3a3a] transition-colors"
                    >
                      <span className="font-medium">{spot.name}</span>
                      {pageNums && pageNums.length > 0 && (
                        <span className="text-xs text-[#999]">p.{pageNums.join(",")}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </CollapsibleSection>
          )}

          {/* Events */}
          {sortedEvents.length > 0 && (
            <CollapsibleSection title="Events" count={sortedEvents.length}>
              <div className="flex flex-wrap gap-2">
                {sortedEvents.map((event) => {
                  const appearance = eventAppearances.find((a) => a.entityId === event.id);
                  const pageNums = appearance?.pageNumbers as number[] | undefined;
                  return (
                    <Link
                      key={event.id}
                      href={getEntityPageLink(magazineId, pageNums || [], "event", event.id, event.name)}
                      className="inline-flex items-center gap-2 border border-[#ebebeb] px-3 py-1.5 text-sm hover:border-[#3a3a3a] transition-colors"
                    >
                      <span className="font-medium">{event.name}</span>
                      {event.date && <span className="text-xs text-[#666]">{event.date}</span>}
                      {pageNums && pageNums.length > 0 && (
                        <span className="text-xs text-[#999]">p.{pageNums.join(",")}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </CollapsibleSection>
          )}

          {/* Photographers */}
          {sortedPhotographers.length > 0 && (
            <CollapsibleSection title="Photographers" count={sortedPhotographers.length}>
              <div className="flex flex-wrap gap-2">
                {sortedPhotographers.map((photographer) => {
                  const appearance = photographerAppearances.find((a) => a.entityId === photographer.id);
                  const pageNums = appearance?.pageNumbers as number[] | undefined;
                  return (
                    <Link
                      key={photographer.id}
                      href={getEntityPageLink(magazineId, pageNums || [], "photographer", photographer.id, photographer.name)}
                      className="inline-flex items-center gap-2 border border-[#ebebeb] px-3 py-1.5 text-sm hover:border-[#3a3a3a] transition-colors"
                    >
                      <span className="font-medium">{photographer.name}</span>
                      {pageNums && pageNums.length > 0 && (
                        <span className="text-xs text-[#999]">p.{pageNums.join(",")}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </CollapsibleSection>
          )}

          {/* Brands */}
          {sortedBrands.length > 0 && (
            <CollapsibleSection title="Brands" count={sortedBrands.length}>
              <div className="flex flex-wrap gap-2">
                {sortedBrands.map((brand) => {
                  const appearance = brandAppearances.find((a) => a.entityId === brand.id);
                  const pageNums = appearance?.pageNumbers as number[] | undefined;
                  return (
                    <Link
                      key={brand.id}
                      href={getEntityPageLink(magazineId, pageNums || [], "brand", brand.id, brand.name)}
                      className="inline-flex items-center gap-2 border border-[#ebebeb] px-3 py-1.5 text-sm hover:border-[#3a3a3a] transition-colors"
                    >
                      <span className="font-medium">{brand.name}</span>
                      {brand.category && <span className="text-xs text-[#666]">({brand.category})</span>}
                      {pageNums && pageNums.length > 0 && (
                        <span className="text-xs text-[#999]">p.{pageNums.join(",")}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </CollapsibleSection>
          )}
          </div>
        </div>
      </main>
    </div>
  );
}
