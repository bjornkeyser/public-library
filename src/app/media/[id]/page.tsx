import { db, media, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/back-button";
import { MediaActions, MediaStatsInline } from "@/components/media-actions";
import { getCollectionStatus, getCollectionStats } from "@/lib/actions/collection";
import { getUserRating, getMediaRatings } from "@/lib/actions/ratings";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function MediaDetailPage({ params }: Props) {
  const { id } = await params;
  const mediaId = parseInt(id, 10);

  // Get media item
  const mediaItem = db
    .select()
    .from(media)
    .where(eq(media.id, mediaId))
    .get();

  if (!mediaItem) {
    notFound();
  }

  // Get submitter info if available
  const submitter = mediaItem.submittedBy
    ? db.select().from(users).where(eq(users.id, mediaItem.submittedBy)).get()
    : null;

  // Collection and rating features
  const [collectionStatus, collectionStats, userRating, ratingStats] = await Promise.all([
    getCollectionStatus(mediaId),
    getCollectionStats(mediaId),
    getUserRating(mediaId),
    getMediaRatings(mediaId),
  ]);

  // Format media type for display
  const mediaTypeLabels: Record<string, string> = {
    magazine: "Magazine",
    vhs: "VHS",
    dvd: "DVD",
    bluray: "Blu-ray",
    digital: "Digital Video",
  };

  const mediaTypeLabel = mediaTypeLabels[mediaItem.mediaType] || mediaItem.mediaType;

  return (
    <div className="min-h-screen bg-white text-[#3a3a3a]">
      {/* Header */}
      <header className="border-b border-[#ebebeb]">
        <div className="container mx-auto px-4 py-6">
          <BackButton
            fallbackHref={mediaItem.mediaType === "magazine" ? "/magazines" : "/videos"}
            fallbackLabel={mediaItem.mediaType === "magazine" ? "All Magazines" : "All Videos"}
          />
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-tight">
                {mediaItem.title}
              </h1>
              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-[#f6f6f6] text-[#666]">
                {mediaTypeLabel}
              </span>
              {mediaItem.completeness === "metadata" && (
                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-800">
                  Cover Only
                </span>
              )}
            </div>
            <MediaStatsInline
              haveCount={collectionStats.haveCount}
              wantCount={collectionStats.wantCount}
              averageRating={ratingStats.averageRating}
              totalRatings={ratingStats.totalRatings}
            />
          </div>
          <p className="mt-1 text-[#666]">
            {mediaItem.volume && `Volume ${mediaItem.volume}`}
            {mediaItem.issue && ` · Issue ${mediaItem.issue}`}
            {(mediaItem.volume || mediaItem.issue) && " · "}
            {mediaItem.month && new Date(2000, mediaItem.month - 1).toLocaleString("default", { month: "long" })}{" "}
            {mediaItem.year}
            {mediaItem.runtimeMinutes && ` · ${mediaItem.runtimeMinutes} min`}
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-[340px_1fr]">
          {/* Left column: Cover */}
          <div className="space-y-6">
            {/* Cover Image */}
            <div className="aspect-[3/4] bg-[#f6f6f6] border border-[#ebebeb] overflow-hidden">
              {mediaItem.coverImage ? (
                <img
                  src={mediaItem.coverImage}
                  alt={`${mediaItem.title} cover`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-6xl">
                    {mediaItem.mediaType === "magazine" ? "📰" : "📼"}
                  </span>
                </div>
              )}
            </div>

            {/* Collection + Rating actions */}
            <MediaActions
              mediaId={mediaId}
              initialCollectionStatus={collectionStatus}
              initialUserRating={userRating}
            />

            {/* Metadata */}
            <div className="border border-[#ebebeb] p-4 space-y-3">
              <h3 className="text-xs uppercase tracking-wide text-[#999]">Details</h3>

              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-[#666]">Type</dt>
                  <dd className="font-medium">{mediaTypeLabel}</dd>
                </div>
                {mediaItem.year && (
                  <div className="flex justify-between">
                    <dt className="text-[#666]">Year</dt>
                    <dd className="font-medium">{mediaItem.year}</dd>
                  </div>
                )}
                {mediaItem.month && (
                  <div className="flex justify-between">
                    <dt className="text-[#666]">Month</dt>
                    <dd className="font-medium">
                      {new Date(2000, mediaItem.month - 1).toLocaleString("default", { month: "long" })}
                    </dd>
                  </div>
                )}
                {mediaItem.volume && (
                  <div className="flex justify-between">
                    <dt className="text-[#666]">Volume</dt>
                    <dd className="font-medium">{mediaItem.volume}</dd>
                  </div>
                )}
                {mediaItem.issue && (
                  <div className="flex justify-between">
                    <dt className="text-[#666]">Issue</dt>
                    <dd className="font-medium">#{mediaItem.issue}</dd>
                  </div>
                )}
                {mediaItem.runtimeMinutes && (
                  <div className="flex justify-between">
                    <dt className="text-[#666]">Runtime</dt>
                    <dd className="font-medium">{mediaItem.runtimeMinutes} min</dd>
                  </div>
                )}
                {mediaItem.barcode && (
                  <div className="flex justify-between">
                    <dt className="text-[#666]">Barcode</dt>
                    <dd className="font-medium font-mono text-xs">{mediaItem.barcode}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          {/* Right column: Description + Info */}
          <div className="space-y-6">
            {/* Description */}
            {mediaItem.description && (
              <div>
                <h2 className="text-lg font-semibold mb-2">Description</h2>
                <p className="text-[#666] leading-relaxed">{mediaItem.description}</p>
              </div>
            )}

            {/* Contribution Info */}
            <div className="border-t border-[#ebebeb] pt-6">
              <h3 className="text-xs uppercase tracking-wide text-[#999] mb-3">Contribution</h3>
              <div className="text-sm text-[#666] space-y-1">
                {submitter && (
                  <p>
                    Submitted by{" "}
                    {submitter.username ? (
                      <Link
                        href={`/profile/${submitter.username}`}
                        className="font-medium text-[#3a3a3a] hover:underline"
                      >
                        {submitter.displayName || submitter.username}
                      </Link>
                    ) : (
                      <span className="font-medium text-[#3a3a3a]">
                        {submitter.displayName || "Anonymous"}
                      </span>
                    )}
                  </p>
                )}
                {mediaItem.createdAt && (
                  <p>Added on {new Date(mediaItem.createdAt).toLocaleDateString()}</p>
                )}
              </div>
            </div>

            {/* Call to action for metadata-only entries */}
            {mediaItem.completeness === "metadata" && (
              <div className="bg-[#f6f6f6] border border-[#ebebeb] p-6">
                <h3 className="font-semibold mb-2">Have the full version?</h3>
                <p className="text-sm text-[#666] mb-4">
                  This entry only has cover art and basic metadata. If you have a copy of this {mediaTypeLabel.toLowerCase()},
                  you can help expand the archive by contributing scans or additional information.
                </p>
                <Link
                  href="/contribute"
                  className="inline-block px-4 py-2 bg-[#3a3a3a] text-white text-sm hover:bg-[#555] transition-colors"
                >
                  Contribute
                </Link>
              </div>
            )}

            {/* Placeholder for future credits section */}
            <div className="border-t border-[#ebebeb] pt-6">
              <h3 className="text-xs uppercase tracking-wide text-[#999] mb-3">Credits</h3>
              <p className="text-sm text-[#666] italic">
                No credits have been added yet.{" "}
                <Link href="/contribute" className="underline hover:text-[#3a3a3a]">
                  Help expand this entry
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
