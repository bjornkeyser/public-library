import { db, magazines, magazinePages, magazineAppearances, skaters, spots, photographers, brands, tricks, events } from "@/lib/db";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/back-button";
import { PageFlipper } from "@/components/page-flipper";
import { TranscriptViewer } from "@/components/transcript-viewer";

type Props = {
  params: Promise<{ id: string; pageNumber: string }>;
  searchParams: Promise<{ highlight?: string; entity?: string; entityType?: string; entityId?: string }>;
};

export default async function PageViewerPage({ params, searchParams }: Props) {
  const { id, pageNumber: pageNumStr } = await params;
  const { highlight, entity, entityType, entityId } = await searchParams;

  // Parse highlighted pages from query param
  const highlightedPages = highlight
    ? highlight.split(",").map((n) => parseInt(n, 10)).filter((n) => !isNaN(n))
    : [];
  const entityName = entity || null;
  const magazineId = parseInt(id, 10);
  const pageNumber = parseInt(pageNumStr, 10);

  // Get magazine
  const magazine = db
    .select()
    .from(magazines)
    .where(eq(magazines.id, magazineId))
    .get();

  if (!magazine) {
    notFound();
  }

  // Get all pages for this magazine
  const allPages = db
    .select()
    .from(magazinePages)
    .where(eq(magazinePages.magazineId, magazineId))
    .all()
    .sort((a, b) => a.pageNumber - b.pageNumber);

  // Get current page
  const currentPage = allPages.find((p) => p.pageNumber === pageNumber);

  if (!currentPage) {
    notFound();
  }

  // Calculate visible pages for the spread view
  // Page 1 is cover (alone), then pages are shown in pairs: 2-3, 4-5, etc.
  const totalPageCount = allPages.length;
  const getVisiblePages = (): number[] => {
    if (pageNumber === 1) {
      return [1]; // Cover page alone
    }
    if (pageNumber === totalPageCount && totalPageCount % 2 === 0) {
      return [totalPageCount]; // Back cover alone if even total
    }

    // Regular spread - even pages on left, odd on right
    if (pageNumber % 2 === 0) {
      // Even page is on the left
      return pageNumber + 1 <= totalPageCount ? [pageNumber, pageNumber + 1] : [pageNumber];
    } else {
      // Odd page > 1 is on the right
      return [pageNumber - 1, pageNumber];
    }
  };

  const visiblePages = getVisiblePages();
  const isSpread = visiblePages.length === 2;
  const spreadLabel = isSpread
    ? `Pages ${visiblePages[0]}-${visiblePages[1]}`
    : `Page ${visiblePages[0]}`;

  // Get prev/next pages
  const prevPage = allPages.find((p) => p.pageNumber === pageNumber - 1);
  const nextPage = allPages.find((p) => p.pageNumber === pageNumber + 1);

  // Get all appearances for this magazine
  const appearances = db
    .select()
    .from(magazineAppearances)
    .where(eq(magazineAppearances.magazineId, magazineId))
    .all();

  // Filter appearances that include any of the visible pages
  const pageAppearances = appearances.filter((a) => {
    const pageNums = a.pageNumbers as number[] | null;
    return pageNums && visiblePages.some(vp => pageNums.includes(vp));
  });

  // Group by entity type
  const skaterAppearances = pageAppearances.filter((a) => a.entityType === "skater");
  const spotAppearances = pageAppearances.filter((a) => a.entityType === "spot");
  const photographerAppearances = pageAppearances.filter((a) => a.entityType === "photographer");
  const brandAppearances = pageAppearances.filter((a) => a.entityType === "brand");
  const trickAppearances = pageAppearances.filter((a) => a.entityType === "trick");
  const eventAppearances = pageAppearances.filter((a) => a.entityType === "event");

  // Get entity details
  const allSkaters = db.select().from(skaters).all();
  const allSpots = db.select().from(spots).all();
  const allPhotographers = db.select().from(photographers).all();
  const allBrands = db.select().from(brands).all();
  const allTricks = db.select().from(tricks).all();
  const allEvents = db.select().from(events).all();

  const skaterList = skaterAppearances.map((a) => allSkaters.find((s) => s.id === a.entityId)).filter(Boolean);
  const spotList = spotAppearances.map((a) => allSpots.find((s) => s.id === a.entityId)).filter(Boolean);
  const photographerList = photographerAppearances.map((a) => allPhotographers.find((p) => p.id === a.entityId)).filter(Boolean);
  const brandList = brandAppearances.map((a) => allBrands.find((b) => b.id === a.entityId)).filter(Boolean);
  const trickList = trickAppearances.map((a) => allTricks.find((t) => t.id === a.entityId)).filter(Boolean);
  const eventList = eventAppearances.map((a) => allEvents.find((e) => e.id === a.entityId)).filter(Boolean);

  const totalEntities = skaterList.length + spotList.length + photographerList.length + brandList.length + trickList.length + eventList.length;

  // Preserve highlight and entity params in navigation URLs
  const queryParams = new URLSearchParams();
  if (highlight) queryParams.set("highlight", highlight);
  if (entity) queryParams.set("entity", entity);
  if (entityType) queryParams.set("entityType", entityType);
  if (entityId) queryParams.set("entityId", entityId);
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : "";

  // Build entity profile URL if we have the info
  const entityProfileUrl = entityType && entityId ? `/${entityType}s/${entityId}` : null;

  // Prepare pages data for the flipper
  const pagesForFlipper = allPages.map(p => ({
    pageNumber: p.pageNumber,
    imagePath: p.imagePath,
  }));

  // Get transcripts for visible pages
  const transcripts = visiblePages.map(pn => {
    const page = allPages.find(p => p.pageNumber === pn);
    return { pageNumber: pn, text: page?.textContent || null };
  });

  return (
    <div className="min-h-screen bg-white text-[#3a3a3a]">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-[#ebebeb] bg-white">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1 text-sm">
                <BackButton
                  fallbackHref={`/magazines/${magazineId}`}
                  fallbackLabel={`${magazine.title} Vol.${magazine.volume} #${magazine.issue}`}
                />
                {entityName && entityProfileUrl && (
                  <>
                    <span className="text-[#999]">→</span>
                    <Link
                      href={entityProfileUrl}
                      className="text-[#e0b200] hover:text-[#c49a00] hover:underline"
                    >
                      {entityName}
                    </Link>
                  </>
                )}
              </div>
              <h1 className="mt-1 text-xl font-semibold">{spreadLabel}</h1>
            </div>

            <div className="text-sm text-[#666]">
              {highlightedPages.length > 0 && (
                <span className="text-[#e0b200]">
                  {highlightedPages.length} highlighted page{highlightedPages.length !== 1 && "s"}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-4">
          {/* Page Flipper */}
          <div className="lg:col-span-3">
            <PageFlipper
              pages={pagesForFlipper}
              magazineId={magazineId}
              currentPage={pageNumber}
              highlightedPages={highlightedPages}
            />
            <TranscriptViewer transcripts={transcripts} />
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Jump to page */}
            <div className="border border-[#ebebeb] p-4">
              <h3 className="text-xs font-medium uppercase tracking-wide text-[#999] mb-3">Jump to page</h3>
              <div className="flex flex-wrap gap-1">
                {allPages.map((p) => {
                  const isHighlighted = highlightedPages.includes(p.pageNumber);
                  const isCurrent = visiblePages.includes(p.pageNumber);
                  return (
                    <Link
                      key={p.pageNumber}
                      href={`/magazines/${magazineId}/page/${p.pageNumber}${queryString}`}
                      className={`w-8 h-8 flex items-center justify-center text-xs font-medium transition-colors border ${
                        isCurrent
                          ? "bg-[#3a3a3a] !text-white border-[#3a3a3a]"
                          : isHighlighted
                          ? "bg-[#e0b200]/20 border-[#e0b200] text-[#8a6d00] hover:bg-[#e0b200]/30"
                          : "border-[#ebebeb] hover:border-[#3a3a3a] text-[#3a3a3a]"
                      }`}
                    >
                      {p.pageNumber}
                    </Link>
                  );
                })}
              </div>
              {highlightedPages.length > 0 && (
                <div className="mt-2 text-xs text-[#e0b200]">
                  {entityName ? (
                    <div>
                      <div>Pages featuring "{entityName}"</div>
                      {entityProfileUrl && (
                        <Link
                          href={entityProfileUrl}
                          className="mt-1 inline-block text-[#3a3a3a] underline hover:text-[#c49a00]"
                        >
                          View all appearances →
                        </Link>
                      )}
                    </div>
                  ) : (
                    "Highlighted pages show entity matches"
                  )}
                </div>
              )}
            </div>

            {/* Entities on this page */}
            <div className="border border-[#ebebeb] p-4">
              <h2 className="mb-4 font-semibold text-lg uppercase tracking-wide">
                {isSpread ? "On these pages" : "On this page"}
                {totalEntities > 0 && (
                  <span className="ml-2 text-sm font-normal text-[#999] normal-case">({totalEntities})</span>
                )}
              </h2>

              {totalEntities === 0 ? (
                <p className="text-sm text-[#999]">No entities indexed on this page</p>
              ) : (
                <div className="space-y-4">
                  {/* Skaters */}
                  {skaterList.length > 0 && (
                    <div>
                      <h3 className="text-xs font-medium uppercase tracking-wide text-[#999] mb-2">Skaters</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {skaterList.map((skater) => (
                          <Link
                            key={skater!.id}
                            href={`/skaters/${skater!.id}`}
                            className="border border-[#ebebeb] px-2 py-1 text-xs hover:border-[#3a3a3a]"
                          >
                            {skater!.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tricks */}
                  {trickList.length > 0 && (
                    <div>
                      <h3 className="text-xs font-medium uppercase tracking-wide text-[#999] mb-2">Tricks</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {trickList.map((trick) => (
                          <Link
                            key={trick!.id}
                            href={`/tricks/${trick!.id}`}
                            className="border border-[#ebebeb] px-2 py-1 text-xs hover:border-[#3a3a3a]"
                          >
                            {trick!.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Spots */}
                  {spotList.length > 0 && (
                    <div>
                      <h3 className="text-xs font-medium uppercase tracking-wide text-[#999] mb-2">Spots</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {spotList.map((spot) => (
                          <Link
                            key={spot!.id}
                            href={`/spots/${spot!.id}`}
                            className="border border-[#ebebeb] px-2 py-1 text-xs hover:border-[#3a3a3a]"
                          >
                            {spot!.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Events */}
                  {eventList.length > 0 && (
                    <div>
                      <h3 className="text-xs font-medium uppercase tracking-wide text-[#999] mb-2">Events</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {eventList.map((event) => (
                          <Link
                            key={event!.id}
                            href={`/events/${event!.id}`}
                            className="border border-[#ebebeb] px-2 py-1 text-xs hover:border-[#3a3a3a]"
                          >
                            {event!.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Photographers */}
                  {photographerList.length > 0 && (
                    <div>
                      <h3 className="text-xs font-medium uppercase tracking-wide text-[#999] mb-2">Photographers</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {photographerList.map((photographer) => (
                          <Link
                            key={photographer!.id}
                            href={`/photographers/${photographer!.id}`}
                            className="border border-[#ebebeb] px-2 py-1 text-xs hover:border-[#3a3a3a]"
                          >
                            {photographer!.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Brands */}
                  {brandList.length > 0 && (
                    <div>
                      <h3 className="text-xs font-medium uppercase tracking-wide text-[#999] mb-2">Brands</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {brandList.map((brand) => (
                          <Link
                            key={brand!.id}
                            href={`/brands/${brand!.id}`}
                            className="border border-[#ebebeb] px-2 py-1 text-xs hover:border-[#3a3a3a]"
                          >
                            {brand!.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
