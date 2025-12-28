import Link from "next/link";

interface Magazine {
  id: number;
  title: string;
  volume: number | null;
  issue: number | null;
  year: number;
  month: number | null;
  coverImage: string | null;
}

interface Appearance {
  id: number;
  magazineId: number;
  pageNumbers: number[] | null;
  verified: boolean | null;
}

interface TimelineItem {
  appearance: Appearance;
  magazine: Magazine | undefined;
  pageCount: number;
}

interface EntityTimelineProps {
  items: TimelineItem[];
  entityName?: string;
  entityType?: string;
  entityId?: number;
}

export function EntityTimeline({ items, entityName, entityType, entityId }: EntityTimelineProps) {
  // Filter out items without magazines and sort chronologically
  const timelineSorted = items
    .filter((item) => item.magazine)
    .sort((a, b) => {
      const aDate = (a.magazine!.year * 12) + (a.magazine!.month || 0);
      const bDate = (b.magazine!.year * 12) + (b.magazine!.month || 0);
      return aDate - bDate;
    });

  if (timelineSorted.length === 0) {
    return <p className="text-[#999]">No appearances found.</p>;
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-[60px] top-0 bottom-0 w-px bg-[#ebebeb]" />

      <div className="space-y-0">
        {timelineSorted.map(({ appearance, magazine }, index) => {
          if (!magazine) return null;
          const pageNums = appearance.pageNumbers as number[] | null;
          const prevMag = index > 0 ? timelineSorted[index - 1].magazine : null;
          const showYear = !prevMag || prevMag.year !== magazine.year;

          return (
            <div key={appearance.id} className="relative flex gap-6">
              {/* Year marker */}
              <div className="w-[60px] flex-shrink-0 text-right">
                {showYear && (
                  <span className="text-lg font-semibold text-[#3a3a3a]">{magazine.year}</span>
                )}
              </div>

              {/* Timeline dot */}
              <div className="relative flex-shrink-0">
                <div className={`w-3 h-3 rounded-full border-2 ${
                  appearance.verified
                    ? "bg-[#3a3a3a] border-[#3a3a3a]"
                    : "bg-white border-[#999]"
                }`} />
              </div>

              {/* Content card */}
              <div className="flex-1 pb-8">
                {(() => {
                  const firstPage = pageNums && pageNums.length > 0 ? pageNums[0] : 1;
                  const params = new URLSearchParams();
                  if (pageNums && pageNums.length > 0) {
                    params.set("highlight", pageNums.join(","));
                  }
                  if (entityName) {
                    params.set("entity", entityName);
                  }
                  if (entityType) {
                    params.set("entityType", entityType);
                  }
                  if (entityId !== undefined) {
                    params.set("entityId", String(entityId));
                  }
                  const queryString = params.toString() ? `?${params.toString()}` : "";
                  const baseHref = `/magazines/${magazine.id}/page/${firstPage}${queryString}`;

                  return (
                    <div className="group border border-[#ebebeb] p-3 transition-colors hover:border-[#3a3a3a]">
                      <Link href={baseHref} className="flex gap-4">
                        {/* Cover thumbnail */}
                        <div className="w-16 h-20 flex-shrink-0 bg-[#f6f6f6] flex items-center justify-center overflow-hidden">
                          {magazine.coverImage ? (
                            <img
                              src={magazine.coverImage}
                              alt={`${magazine.title} cover`}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-2xl">📰</span>
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium group-hover:underline">
                            {magazine.title}
                          </div>
                          <div className="text-sm text-[#666]">
                            Vol.{magazine.volume} #{magazine.issue}
                            {magazine.month && (
                              <span className="ml-1">
                                · {new Date(2000, magazine.month - 1).toLocaleString("default", { month: "long" })}
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>

                      {/* Page links - clickable individually */}
                      {pageNums && pageNums.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {pageNums.slice(0, 8).map((p) => (
                            <Link
                              key={p}
                              href={`/magazines/${magazine.id}/page/${p}${queryString}`}
                              className="inline-flex items-center justify-center w-7 h-7 text-xs border border-[#ebebeb] text-[#666] hover:border-[#3a3a3a] hover:text-[#3a3a3a]"
                            >
                              {p}
                            </Link>
                          ))}
                          {pageNums.length > 8 && (
                            <span className="inline-flex items-center px-2 text-xs text-[#999]">
                              +{pageNums.length - 8}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
