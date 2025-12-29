import { db, skaters, spots, photographers, brands, tricks, events, magazineAppearances, magazines } from "@/lib/db";
import { like, eq, and, gte, lte, inArray } from "drizzle-orm";
import Link from "next/link";
import { SearchFilters, ENTITY_TYPES, CONTEXT_TYPES } from "@/components/search-filters";

type Props = {
  searchParams: Promise<{
    q?: string;
    types?: string;       // comma-separated entity types
    entity?: string;      // specific entity "skater:123"
    yearFrom?: string;
    yearTo?: string;
    magazine?: string;
    contexts?: string;    // comma-separated contexts
  }>;
};

export default async function SearchPage({ searchParams }: Props) {
  const params = await searchParams;
  const query = params.q?.trim() || "";
  const typeFilter = params.types ? params.types.split(",") : [];
  const entityFilter = params.entity || null;
  const yearFrom = params.yearFrom ? parseInt(params.yearFrom, 10) : null;
  const yearTo = params.yearTo ? parseInt(params.yearTo, 10) : null;
  const magazineFilter = params.magazine || null;
  const contextFilter = params.contexts ? params.contexts.split(",") : [];

  // Get all data for filters
  const allMagazines = db.select().from(magazines).all();
  const allAppearances = db.select().from(magazineAppearances).all();

  // Build entity list for autocomplete
  const allSkaters = db.select().from(skaters).all();
  const allSpots = db.select().from(spots).all();
  const allPhotographers = db.select().from(photographers).all();
  const allBrands = db.select().from(brands).all();
  const allTricks = db.select().from(tricks).all();
  const allEvents = db.select().from(events).all();

  const entityOptions = [
    ...allSkaters.map(s => ({ type: "skater", id: s.id, name: s.name })),
    ...allSpots.map(s => ({ type: "spot", id: s.id, name: s.name })),
    ...allPhotographers.map(p => ({ type: "photographer", id: p.id, name: p.name })),
    ...allBrands.map(b => ({ type: "brand", id: b.id, name: b.name })),
    ...allTricks.map(t => ({ type: "trick", id: t.id, name: t.name })),
    ...allEvents.map(e => ({ type: "event", id: e.id, name: e.name })),
  ].sort((a, b) => a.name.localeCompare(b.name));

  // Get unique magazine titles
  const uniqueMagazines = [...new Set(allMagazines.map(m => m.title))].sort();

  // Get year range
  const years = allMagazines.map(m => m.year).filter(y => y != null);
  const yearRange = {
    min: years.length > 0 ? Math.min(...years) : 1980,
    max: years.length > 0 ? Math.max(...years) : 2024,
  };

  // Filter appearances by magazine/year/context filters
  let filteredAppearances = allAppearances;

  if (yearFrom || yearTo || magazineFilter || contextFilter.length > 0) {
    // Get magazine IDs that match filters
    let filteredMagazineIds = allMagazines.map(m => m.id);

    if (magazineFilter) {
      filteredMagazineIds = allMagazines
        .filter(m => m.title === magazineFilter)
        .map(m => m.id);
    }

    if (yearFrom) {
      filteredMagazineIds = filteredMagazineIds.filter(id => {
        const mag = allMagazines.find(m => m.id === id);
        return mag && mag.year >= yearFrom;
      });
    }

    if (yearTo) {
      filteredMagazineIds = filteredMagazineIds.filter(id => {
        const mag = allMagazines.find(m => m.id === id);
        return mag && mag.year <= yearTo;
      });
    }

    filteredAppearances = allAppearances.filter(a => {
      // Filter by magazine
      if (!filteredMagazineIds.includes(a.magazineId)) return false;

      // Filter by context
      if (contextFilter.length > 0 && (!a.context || !contextFilter.includes(a.context))) {
        return false;
      }

      return true;
    });
  }

  // Helper to count appearances (with filters applied)
  const getAppearanceCount = (entityType: string, entityId: number) => {
    return filteredAppearances.filter(a => a.entityType === entityType && a.entityId === entityId).length;
  };

  // Helper to check if entity has any appearances (after filters)
  const hasAppearances = (entityType: string, entityId: number) => {
    return filteredAppearances.some(a => a.entityType === entityType && a.entityId === entityId);
  };

  // Helper to get first appearance link with highlighting
  const getEntityLink = (entityType: string, entityId: number, entityName: string) => {
    const appearances = filteredAppearances.filter(a => a.entityType === entityType && a.entityId === entityId);
    if (appearances.length === 0) {
      return `/${entityType}s/${entityId}`;
    }

    // Get all page numbers across all appearances, sorted
    const allPageNumbers: number[] = [];
    appearances.forEach(a => {
      if (a.pageNumbers && a.pageNumbers.length > 0) {
        allPageNumbers.push(...a.pageNumbers);
      }
    });

    if (allPageNumbers.length === 0) {
      // No specific pages, go to first magazine
      const firstAppearance = appearances[0];
      return `/magazines/${firstAppearance.magazineId}`;
    }

    // Sort and get the first page from the first magazine with pages
    const firstAppearanceWithPages = appearances.find(a => a.pageNumbers && a.pageNumbers.length > 0);
    if (!firstAppearanceWithPages) {
      return `/magazines/${appearances[0].magazineId}`;
    }

    const sortedPages = [...firstAppearanceWithPages.pageNumbers!].sort((a, b) => a - b);
    const firstPage = sortedPages[0];

    const params = new URLSearchParams();
    params.set("highlight", sortedPages.join(","));
    params.set("entity", entityName);
    params.set("entityType", entityType);
    params.set("entityId", String(entityId));

    return `/magazines/${firstAppearanceWithPages.magazineId}/page/${firstPage}?${params.toString()}`;
  };

  // Check if we have any filters or query
  const hasSearchCriteria = query || entityFilter || typeFilter.length > 0 || yearFrom || yearTo || magazineFilter || contextFilter.length > 0;

  // If searching for a specific entity, just return that
  if (entityFilter) {
    const [entityType, entityIdStr] = entityFilter.split(":");
    const entityId = parseInt(entityIdStr, 10);

    let entity = null;
    let entityName = "";

    switch (entityType) {
      case "skater":
        entity = allSkaters.find(s => s.id === entityId);
        entityName = entity?.name || "";
        break;
      case "spot":
        entity = allSpots.find(s => s.id === entityId);
        entityName = entity?.name || "";
        break;
      case "photographer":
        entity = allPhotographers.find(p => p.id === entityId);
        entityName = entity?.name || "";
        break;
      case "brand":
        entity = allBrands.find(b => b.id === entityId);
        entityName = entity?.name || "";
        break;
      case "trick":
        entity = allTricks.find(t => t.id === entityId);
        entityName = entity?.name || "";
        break;
      case "event":
        entity = allEvents.find(e => e.id === entityId);
        entityName = entity?.name || "";
        break;
    }

    // Get appearances for this entity with filters applied
    const appearances = filteredAppearances.filter(a =>
      a.entityType === entityType && a.entityId === entityId
    );

    // Get matching magazines
    const matchingMagazines = appearances.map(a => {
      const mag = allMagazines.find(m => m.id === a.magazineId);
      return { ...a, magazine: mag };
    }).filter(a => a.magazine);

    return (
      <div className="min-h-screen bg-white text-[#3a3a3a]">
        <main className="container mx-auto px-4 py-8">
          <SearchFilters
            entities={entityOptions}
            magazines={uniqueMagazines}
            yearRange={yearRange}
          />

          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-2">{entityName}</h2>
            <p className="text-[#666] mb-6">
              {appearances.length} appearance{appearances.length !== 1 && "s"} in magazines
              {(yearFrom || yearTo) && ` (${yearFrom || yearRange.min}–${yearTo || yearRange.max})`}
              {magazineFilter && ` in ${magazineFilter}`}
            </p>

            {matchingMagazines.length === 0 ? (
              <p className="text-[#999]">No appearances found with current filters.</p>
            ) : (
              <div className="space-y-2">
                {matchingMagazines.map((appearance) => {
                  const pageNums = appearance.pageNumbers || [];
                  const sortedPages = [...pageNums].sort((a, b) => a - b);
                  const firstPage = sortedPages[0] || 1;

                  const params = new URLSearchParams();
                  if (sortedPages.length > 0) {
                    params.set("highlight", sortedPages.join(","));
                    params.set("entity", entityName);
                    params.set("entityType", entityType);
                    params.set("entityId", String(entityId));
                  }
                  const href = sortedPages.length > 0
                    ? `/magazines/${appearance.magazineId}/page/${firstPage}?${params.toString()}`
                    : `/magazines/${appearance.magazineId}`;

                  return (
                    <Link
                      key={appearance.id}
                      href={href}
                      className="flex items-center justify-between border border-[#ebebeb] px-4 py-3 transition-colors hover:border-[#3a3a3a]"
                    >
                      <div>
                        <span className="font-medium">{appearance.magazine?.title}</span>
                        <span className="ml-2 text-[#999]">
                          {appearance.magazine?.month && `${new Date(0, appearance.magazine.month - 1).toLocaleString('en', { month: 'short' })} `}
                          {appearance.magazine?.year}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        {appearance.context && (
                          <span className="text-xs text-[#999] capitalize">{appearance.context.replace("_", " ")}</span>
                        )}
                        {pageNums.length > 0 && (
                          <span className="text-sm text-[#999]">
                            p. {pageNums.join(", ")}
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // Regular search with text query
  const pattern = query ? `%${query}%` : null;

  // Search entity tables (optionally filtered by type)
  const shouldSearchType = (type: string) => typeFilter.length === 0 || typeFilter.includes(type);

  let skaterResults: Array<typeof allSkaters[0] & { appearanceCount: number }> = [];
  let spotResults: Array<typeof allSpots[0] & { appearanceCount: number }> = [];
  let photographerResults: Array<typeof allPhotographers[0] & { appearanceCount: number }> = [];
  let brandResults: Array<typeof allBrands[0] & { appearanceCount: number }> = [];
  let trickResults: Array<typeof allTricks[0] & { appearanceCount: number }> = [];
  let eventResults: Array<typeof allEvents[0] & { appearanceCount: number }> = [];

  if (shouldSearchType("skater")) {
    const baseResults = pattern
      ? db.select().from(skaters).where(like(skaters.name, pattern)).all()
      : allSkaters;
    skaterResults = baseResults
      .map(s => ({ ...s, appearanceCount: getAppearanceCount("skater", s.id) }))
      .filter(s => !hasSearchCriteria || hasAppearances("skater", s.id) || pattern)
      .filter(s => yearFrom || yearTo || magazineFilter || contextFilter.length > 0 ? s.appearanceCount > 0 : true)
      .sort((a, b) => b.appearanceCount - a.appearanceCount);
  }

  if (shouldSearchType("spot")) {
    const baseResults = pattern
      ? db.select().from(spots).where(like(spots.name, pattern)).all()
      : allSpots;
    spotResults = baseResults
      .map(s => ({ ...s, appearanceCount: getAppearanceCount("spot", s.id) }))
      .filter(s => !hasSearchCriteria || hasAppearances("spot", s.id) || pattern)
      .filter(s => yearFrom || yearTo || magazineFilter || contextFilter.length > 0 ? s.appearanceCount > 0 : true)
      .sort((a, b) => b.appearanceCount - a.appearanceCount);
  }

  if (shouldSearchType("photographer")) {
    const baseResults = pattern
      ? db.select().from(photographers).where(like(photographers.name, pattern)).all()
      : allPhotographers;
    photographerResults = baseResults
      .map(p => ({ ...p, appearanceCount: getAppearanceCount("photographer", p.id) }))
      .filter(p => !hasSearchCriteria || hasAppearances("photographer", p.id) || pattern)
      .filter(p => yearFrom || yearTo || magazineFilter || contextFilter.length > 0 ? p.appearanceCount > 0 : true)
      .sort((a, b) => b.appearanceCount - a.appearanceCount);
  }

  if (shouldSearchType("brand")) {
    const baseResults = pattern
      ? db.select().from(brands).where(like(brands.name, pattern)).all()
      : allBrands;
    brandResults = baseResults
      .map(b => ({ ...b, appearanceCount: getAppearanceCount("brand", b.id) }))
      .filter(b => !hasSearchCriteria || hasAppearances("brand", b.id) || pattern)
      .filter(b => yearFrom || yearTo || magazineFilter || contextFilter.length > 0 ? b.appearanceCount > 0 : true)
      .sort((a, b) => b.appearanceCount - a.appearanceCount);
  }

  if (shouldSearchType("trick")) {
    const baseResults = pattern
      ? db.select().from(tricks).where(like(tricks.name, pattern)).all()
      : allTricks;
    trickResults = baseResults
      .map(t => ({ ...t, appearanceCount: getAppearanceCount("trick", t.id) }))
      .filter(t => !hasSearchCriteria || hasAppearances("trick", t.id) || pattern)
      .filter(t => yearFrom || yearTo || magazineFilter || contextFilter.length > 0 ? t.appearanceCount > 0 : true)
      .sort((a, b) => b.appearanceCount - a.appearanceCount);
  }

  if (shouldSearchType("event")) {
    const baseResults = pattern
      ? db.select().from(events).where(like(events.name, pattern)).all()
      : allEvents;
    eventResults = baseResults
      .map(e => ({ ...e, appearanceCount: getAppearanceCount("event", e.id) }))
      .filter(e => !hasSearchCriteria || hasAppearances("event", e.id) || pattern)
      .filter(e => yearFrom || yearTo || magazineFilter || contextFilter.length > 0 ? e.appearanceCount > 0 : true)
      .sort((a, b) => b.appearanceCount - a.appearanceCount);
  }

  const totalResults = skaterResults.length + spotResults.length + brandResults.length +
    photographerResults.length + trickResults.length + eventResults.length;

  // Build filter description
  const filterParts: string[] = [];
  if (query) filterParts.push(`matching "${query}"`);
  if (typeFilter.length > 0) {
    const typeLabels = typeFilter.map(t => ENTITY_TYPES.find(et => et.value === t)?.label || t);
    filterParts.push(`in ${typeLabels.join(", ")}`);
  }
  if (yearFrom || yearTo) filterParts.push(`from ${yearFrom || yearRange.min}–${yearTo || yearRange.max}`);
  if (magazineFilter) filterParts.push(`in ${magazineFilter}`);
  if (contextFilter.length > 0) {
    const contextLabels = contextFilter.map(c => CONTEXT_TYPES.find(ct => ct.value === c)?.label || c);
    filterParts.push(`appearing as ${contextLabels.join(", ")}`);
  }

  return (
    <div className="min-h-screen bg-white text-[#3a3a3a]">
      <main className="container mx-auto px-4 py-8">
        <SearchFilters
          entities={entityOptions}
          magazines={uniqueMagazines}
          yearRange={yearRange}
        />

        {!hasSearchCriteria ? (
          <p className="mt-8 text-[#666]">Enter a search term or select filters to find skaters, spots, brands, and more.</p>
        ) : (
          <div className="mt-8">
            <p className="text-[#666] mb-6">
              {totalResults} result{totalResults !== 1 && "s"}
              {filterParts.length > 0 && ` ${filterParts.join(", ")}`}
            </p>

            {totalResults === 0 && (
              <p className="text-[#999]">No results found. Try different search terms or filters.</p>
            )}

            <div className="space-y-8">
              {/* Skaters */}
              {skaterResults.length > 0 && (
                <section>
                  <h2 className="mb-3 text-lg font-semibold uppercase tracking-wide">
                    Skaters <span className="text-sm font-normal text-[#999]">({skaterResults.length})</span>
                  </h2>
                  <div className="space-y-2">
                    {skaterResults.map((skater) => (
                      <Link
                        key={skater.id}
                        href={`/skaters/${skater.id}`}
                        className="flex items-center justify-between border border-[#ebebeb] px-4 py-3 transition-colors hover:border-[#3a3a3a]"
                      >
                        <span className="font-medium">{skater.name}</span>
                        <span className="text-sm text-[#999]">{skater.appearanceCount} mag{skater.appearanceCount !== 1 && "s"}</span>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {/* Spots */}
              {spotResults.length > 0 && (
                <section>
                  <h2 className="mb-3 text-lg font-semibold uppercase tracking-wide">
                    Spots <span className="text-sm font-normal text-[#999]">({spotResults.length})</span>
                  </h2>
                  <div className="space-y-2">
                    {spotResults.map((spot) => (
                      <Link
                        key={spot.id}
                        href={`/spots/${spot.id}`}
                        className="flex items-center justify-between border border-[#ebebeb] px-4 py-3 transition-colors hover:border-[#3a3a3a]"
                      >
                        <span className="font-medium">{spot.name}</span>
                        <span className="text-sm text-[#999]">{spot.appearanceCount} mag{spot.appearanceCount !== 1 && "s"}</span>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {/* Brands */}
              {brandResults.length > 0 && (
                <section>
                  <h2 className="mb-3 text-lg font-semibold uppercase tracking-wide">
                    Brands <span className="text-sm font-normal text-[#999]">({brandResults.length})</span>
                  </h2>
                  <div className="space-y-2">
                    {brandResults.map((brand) => (
                      <Link
                        key={brand.id}
                        href={`/brands/${brand.id}`}
                        className="flex items-center justify-between border border-[#ebebeb] px-4 py-3 transition-colors hover:border-[#3a3a3a]"
                      >
                        <span className="font-medium">{brand.name}</span>
                        <span className="text-sm text-[#999]">{brand.appearanceCount} mag{brand.appearanceCount !== 1 && "s"}</span>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {/* Photographers */}
              {photographerResults.length > 0 && (
                <section>
                  <h2 className="mb-3 text-lg font-semibold uppercase tracking-wide">
                    Photographers <span className="text-sm font-normal text-[#999]">({photographerResults.length})</span>
                  </h2>
                  <div className="space-y-2">
                    {photographerResults.map((photographer) => (
                      <Link
                        key={photographer.id}
                        href={`/photographers/${photographer.id}`}
                        className="flex items-center justify-between border border-[#ebebeb] px-4 py-3 transition-colors hover:border-[#3a3a3a]"
                      >
                        <span className="font-medium">{photographer.name}</span>
                        <span className="text-sm text-[#999]">{photographer.appearanceCount} mag{photographer.appearanceCount !== 1 && "s"}</span>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {/* Tricks */}
              {trickResults.length > 0 && (
                <section>
                  <h2 className="mb-3 text-lg font-semibold uppercase tracking-wide">
                    Tricks <span className="text-sm font-normal text-[#999]">({trickResults.length})</span>
                  </h2>
                  <div className="space-y-2">
                    {trickResults.map((trick) => (
                      <Link
                        key={trick.id}
                        href={`/tricks/${trick.id}`}
                        className="flex items-center justify-between border border-[#ebebeb] px-4 py-3 transition-colors hover:border-[#3a3a3a]"
                      >
                        <span className="font-medium">{trick.name}</span>
                        <span className="text-sm text-[#999]">{trick.appearanceCount} mag{trick.appearanceCount !== 1 && "s"}</span>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {/* Events */}
              {eventResults.length > 0 && (
                <section>
                  <h2 className="mb-3 text-lg font-semibold uppercase tracking-wide">
                    Events <span className="text-sm font-normal text-[#999]">({eventResults.length})</span>
                  </h2>
                  <div className="space-y-2">
                    {eventResults.map((event) => (
                      <Link
                        key={event.id}
                        href={`/events/${event.id}`}
                        className="flex items-center justify-between border border-[#ebebeb] px-4 py-3 transition-colors hover:border-[#3a3a3a]"
                      >
                        <span className="font-medium">{event.name}</span>
                        <span className="text-sm text-[#999]">{event.appearanceCount} mag{event.appearanceCount !== 1 && "s"}</span>
                      </Link>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
