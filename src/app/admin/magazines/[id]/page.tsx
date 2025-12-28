import { db, magazines, magazinePages, magazineAppearances } from "@/lib/db";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MagazineActions } from "./actions";

type Props = {
  params: Promise<{ id: string }>;
};

function StatusBadge({ status }: { status: string }) {
  const styles = {
    published: "bg-green-100 text-green-800",
    review: "bg-amber-100 text-amber-800",
    processing: "bg-blue-100 text-blue-800",
    pending: "bg-[#f6f6f6] text-[#666]",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
        styles[status as keyof typeof styles] || styles.pending
      }`}
    >
      {status}
    </span>
  );
}

export default async function MagazineControlPanel({ params }: Props) {
  const { id } = await params;
  const magazineId = parseInt(id, 10);

  const magazine = db
    .select()
    .from(magazines)
    .where(eq(magazines.id, magazineId))
    .get();

  if (!magazine) {
    notFound();
  }

  const pages = db
    .select()
    .from(magazinePages)
    .where(eq(magazinePages.magazineId, magazineId))
    .all()
    .sort((a, b) => a.pageNumber - b.pageNumber);

  const appearances = db
    .select()
    .from(magazineAppearances)
    .where(eq(magazineAppearances.magazineId, magazineId))
    .all();

  const verifiedCount = appearances.filter((a) => a.verified).length;
  const unverifiedCount = appearances.length - verifiedCount;

  // Group appearances by type
  const entityCounts = {
    skaters: appearances.filter((a) => a.entityType === "skater").length,
    spots: appearances.filter((a) => a.entityType === "spot").length,
    photographers: appearances.filter((a) => a.entityType === "photographer").length,
    brands: appearances.filter((a) => a.entityType === "brand").length,
    tricks: appearances.filter((a) => a.entityType === "trick").length,
    events: appearances.filter((a) => a.entityType === "event").length,
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          href="/admin"
          className="text-sm text-[#666] hover:text-[#3a3a3a]"
        >
          ← Back to Dashboard
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {magazine.title}
            </h1>
            <StatusBadge status={magazine.status || "pending"} />
          </div>
          <p className="text-[#666]">
            {magazine.volume && `Vol.${magazine.volume} `}
            {magazine.issue && `#${magazine.issue} `}
            {magazine.month && `(${new Date(2000, magazine.month - 1).toLocaleString("default", { month: "long" })}) `}
            {magazine.year}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="border border-[#ebebeb] p-4">
          <div className="text-2xl font-semibold">{pages.length}</div>
          <div className="text-sm text-[#666]">Pages</div>
        </div>
        <div className="border border-[#ebebeb] p-4">
          <div className="text-2xl font-semibold">{appearances.length}</div>
          <div className="text-sm text-[#666]">Entities</div>
        </div>
        <div className="border border-[#ebebeb] p-4">
          <div className="text-2xl font-semibold text-green-600">{verifiedCount}</div>
          <div className="text-sm text-[#666]">Verified</div>
        </div>
        <div className="border border-[#ebebeb] p-4">
          <div className="text-2xl font-semibold text-amber-600">{unverifiedCount}</div>
          <div className="text-sm text-[#666]">Unverified</div>
        </div>
      </div>

      {/* Actions Panel */}
      <div className="border border-[#ebebeb] mb-8">
        <div className="border-b border-[#ebebeb] bg-[#f6f6f6] px-4 py-3">
          <h2 className="font-semibold uppercase tracking-wide text-sm">Actions</h2>
        </div>
        <div className="p-4">
          <MagazineActions
            magazineId={magazineId}
            status={magazine.status || "pending"}
            hasPages={pages.length > 0}
            hasEntities={appearances.length > 0}
            allVerified={unverifiedCount === 0 && appearances.length > 0}
          />
        </div>
      </div>

      {/* Entity Breakdown */}
      {appearances.length > 0 && (
        <div className="border border-[#ebebeb] mb-8">
          <div className="border-b border-[#ebebeb] bg-[#f6f6f6] px-4 py-3 flex items-center justify-between">
            <h2 className="font-semibold uppercase tracking-wide text-sm">
              Extracted Entities
            </h2>
            <Link
              href={`/magazines/${magazineId}/review`}
              className="text-sm text-[#666] hover:text-[#3a3a3a] underline"
            >
              Review & Edit →
            </Link>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-6 gap-4 text-center">
              <div>
                <div className="text-xl font-semibold">{entityCounts.skaters}</div>
                <div className="text-xs text-[#999] uppercase">Skaters</div>
              </div>
              <div>
                <div className="text-xl font-semibold">{entityCounts.spots}</div>
                <div className="text-xs text-[#999] uppercase">Spots</div>
              </div>
              <div>
                <div className="text-xl font-semibold">{entityCounts.photographers}</div>
                <div className="text-xs text-[#999] uppercase">Photographers</div>
              </div>
              <div>
                <div className="text-xl font-semibold">{entityCounts.brands}</div>
                <div className="text-xs text-[#999] uppercase">Brands</div>
              </div>
              <div>
                <div className="text-xl font-semibold">{entityCounts.tricks}</div>
                <div className="text-xs text-[#999] uppercase">Tricks</div>
              </div>
              <div>
                <div className="text-xl font-semibold">{entityCounts.events}</div>
                <div className="text-xs text-[#999] uppercase">Events</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Page Thumbnails */}
      {pages.length > 0 && (
        <div className="border border-[#ebebeb]">
          <div className="border-b border-[#ebebeb] bg-[#f6f6f6] px-4 py-3 flex items-center justify-between">
            <h2 className="font-semibold uppercase tracking-wide text-sm">
              Pages ({pages.length})
            </h2>
            <Link
              href={`/admin/magazines/${magazineId}/ocr`}
              className="text-sm text-[#666] hover:text-[#3a3a3a] underline"
            >
              Edit OCR Text →
            </Link>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-8 gap-3">
              {pages.map((page) => (
                <Link
                  key={page.id}
                  href={`/admin/magazines/${magazineId}/ocr?page=${page.pageNumber}`}
                  className="group"
                >
                  <div className="aspect-[3/4] bg-[#f6f6f6] border border-[#ebebeb] overflow-hidden group-hover:border-[#3a3a3a] transition-colors">
                    {page.imagePath ? (
                      <img
                        src={page.imagePath}
                        alt={`Page ${page.pageNumber}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#999] text-xs">
                        No image
                      </div>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-center text-[#666]">
                    {page.pageNumber}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
