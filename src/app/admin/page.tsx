import { db, magazines, magazinePages, magazineAppearances, locations, spots } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import { GeocodeButton } from "./geocode-button";

function StatusBadge({ status }: { status: string }) {
  const styles = {
    published: "bg-green-100 text-green-800",
    review: "bg-amber-100 text-amber-800",
    processing: "bg-blue-100 text-blue-800",
    pending: "bg-[#f6f6f6] text-[#666]",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
        styles[status as keyof typeof styles] || styles.pending
      }`}
    >
      {status}
    </span>
  );
}

export default function AdminDashboard() {
  // Get all magazines with counts
  const allMagazines = db
    .select()
    .from(magazines)
    .orderBy(desc(magazines.updatedAt))
    .all();

  const magazinesWithCounts = allMagazines.map((mag) => {
    const pageCount = db
      .select()
      .from(magazinePages)
      .where(eq(magazinePages.magazineId, mag.id))
      .all().length;

    const entityCount = db
      .select()
      .from(magazineAppearances)
      .where(eq(magazineAppearances.magazineId, mag.id))
      .all().length;

    return { ...mag, pageCount, entityCount };
  });

  const stats = {
    total: allMagazines.length,
    pending: allMagazines.filter((m) => m.status === "pending").length,
    processing: allMagazines.filter((m) => m.status === "processing").length,
    review: allMagazines.filter((m) => m.status === "review").length,
    published: allMagazines.filter((m) => m.status === "published").length,
  };

  // Location stats for geocoding
  const allLocations = db.select().from(locations).all();
  const allSpots = db.select().from(spots).all();
  const locationsWithoutCoords = allLocations.filter((l) => !l.latitude).length;
  const spotsWithoutCoords = allSpots.filter((s) => !s.latitude).length;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight mb-6">
        Magazine Management
      </h1>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4 mb-8">
        <div className="border border-[#ebebeb] p-4">
          <div className="text-2xl font-semibold">{stats.total}</div>
          <div className="text-sm text-[#666]">Total</div>
        </div>
        <div className="border border-[#ebebeb] p-4">
          <div className="text-2xl font-semibold text-[#666]">
            {stats.pending}
          </div>
          <div className="text-sm text-[#666]">Pending</div>
        </div>
        <div className="border border-[#ebebeb] p-4">
          <div className="text-2xl font-semibold text-blue-600">
            {stats.processing}
          </div>
          <div className="text-sm text-[#666]">Processing</div>
        </div>
        <div className="border border-[#ebebeb] p-4">
          <div className="text-2xl font-semibold text-amber-600">
            {stats.review}
          </div>
          <div className="text-sm text-[#666]">Review</div>
        </div>
        <div className="border border-[#ebebeb] p-4">
          <div className="text-2xl font-semibold text-green-600">
            {stats.published}
          </div>
          <div className="text-sm text-[#666]">Published</div>
        </div>
      </div>

      {/* Tools Row */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {/* Map & Geocoding */}
        <div className="border border-[#ebebeb] p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Map & Locations</h2>
              <p className="text-sm text-[#666]">
                {allLocations.length} locations, {allSpots.length} spots
                {(locationsWithoutCoords > 0 || spotsWithoutCoords > 0) && (
                  <span className="ml-1">
                    ({locationsWithoutCoords + spotsWithoutCoords} need coords)
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/map"
                className="border border-[#ebebeb] px-3 py-1.5 text-sm hover:border-[#3a3a3a] transition-colors"
              >
                View Map
              </Link>
              <GeocodeButton
                locationCount={locationsWithoutCoords}
                spotCount={spotsWithoutCoords}
              />
            </div>
          </div>
        </div>

        {/* Entity Deduplication */}
        <div className="border border-[#ebebeb] p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Entity Deduplication</h2>
              <p className="text-sm text-[#666]">
                Find and merge duplicate entities
              </p>
            </div>
            <Link
              href="/admin/duplicates"
              className="border border-[#3a3a3a] px-3 py-1.5 text-sm font-medium hover:bg-[#3a3a3a] hover:text-white transition-colors"
            >
              Find Duplicates
            </Link>
          </div>
        </div>
      </div>

      {/* Magazine Table */}
      <div className="border border-[#ebebeb]">
        <div className="border-b border-[#ebebeb] bg-[#f6f6f6] px-4 py-3">
          <h2 className="font-semibold uppercase tracking-wide text-sm">
            All Magazines
          </h2>
        </div>

        {magazinesWithCounts.length === 0 ? (
          <div className="p-8 text-center text-[#999]">
            No magazines yet.{" "}
            <Link href="/admin/upload" className="text-[#3a3a3a] underline">
              Upload your first PDF
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#ebebeb] text-left text-xs uppercase tracking-wide text-[#999]">
                <th className="px-4 py-3 font-medium">Magazine</th>
                <th className="px-4 py-3 font-medium">Year</th>
                <th className="px-4 py-3 font-medium">Pages</th>
                <th className="px-4 py-3 font-medium">Entities</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ebebeb]">
              {magazinesWithCounts.map((mag) => (
                <tr key={mag.id} className="hover:bg-[#f6f6f6]">
                  <td className="px-4 py-3">
                    <div className="font-medium">{mag.title}</div>
                    <div className="text-xs text-[#999]">
                      {mag.volume && `Vol.${mag.volume} `}
                      {mag.issue && `#${mag.issue}`}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">{mag.year}</td>
                  <td className="px-4 py-3 text-sm">{mag.pageCount}</td>
                  <td className="px-4 py-3 text-sm">{mag.entityCount}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={mag.status || "pending"} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/magazines/${mag.id}`}
                        className="border border-[#3a3a3a] px-2 py-1 text-xs font-medium hover:bg-[#3a3a3a] hover:text-white transition-colors"
                      >
                        Manage
                      </Link>
                      {mag.pageCount > 0 && (
                        <Link
                          href={`/admin/magazines/${mag.id}/ocr`}
                          className="border border-[#ebebeb] px-2 py-1 text-xs text-[#666] hover:border-[#3a3a3a] transition-colors"
                        >
                          OCR
                        </Link>
                      )}
                      {mag.entityCount > 0 && (
                        <Link
                          href={`/magazines/${mag.id}/review`}
                          className="border border-[#ebebeb] px-2 py-1 text-xs text-[#666] hover:border-[#3a3a3a] transition-colors"
                        >
                          Review
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
