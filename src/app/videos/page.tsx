import { db, media } from "@/lib/db";
import { desc, eq, inArray, and } from "drizzle-orm";
import Link from "next/link";

const VIDEO_TYPES = ["vhs", "dvd", "bluray", "digital"];

const VIDEO_TYPE_LABELS: Record<string, string> = {
  vhs: "VHS",
  dvd: "DVD",
  bluray: "Blu-ray",
  digital: "Digital",
};

export default async function VideosPage() {
  // Get all video entries from media table
  const videos = db
    .select()
    .from(media)
    .where(
      and(
        inArray(media.mediaType, VIDEO_TYPES),
        eq(media.status, "published")
      )
    )
    .orderBy(desc(media.year))
    .all();

  // Group by media type for optional filtering display
  const byType = VIDEO_TYPES.reduce((acc, type) => {
    acc[type] = videos.filter((v) => v.mediaType === type);
    return acc;
  }, {} as Record<string, typeof videos>);

  return (
    <div className="min-h-screen bg-white text-[#3a3a3a]">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold tracking-tight">Videos</h1>
          <p className="mt-1 text-[#666]">{videos.length} videos indexed</p>
        </div>

        {/* Type breakdown */}
        {videos.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {VIDEO_TYPES.map((type) => {
              const count = byType[type]?.length || 0;
              if (count === 0) return null;
              return (
                <span
                  key={type}
                  className="text-xs px-2 py-1 bg-[#f6f6f6] text-[#666]"
                >
                  {VIDEO_TYPE_LABELS[type]}: {count}
                </span>
              );
            })}
          </div>
        )}

        {videos.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-[#ebebeb]">
            <span className="text-4xl mb-4 block">📼</span>
            <h2 className="text-lg font-medium mb-2">No videos yet</h2>
            <p className="text-[#666] mb-4">
              Be the first to add a skate video to the archive.
            </p>
            <Link
              href="/contribute"
              className="inline-block px-4 py-2 bg-[#3a3a3a] text-white text-sm hover:bg-[#555] transition-colors"
            >
              Contribute a Video
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {videos.map((video) => (
              <Link
                key={video.id}
                href={`/media/${video.id}`}
                className="group border border-[#ebebeb] p-4 transition-colors hover:border-[#3a3a3a]"
              >
                <div className="mb-3 aspect-[4/3] bg-[#f6f6f6] flex items-center justify-center overflow-hidden relative">
                  {video.coverImage ? (
                    <img
                      src={video.coverImage}
                      alt={`${video.title} cover`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-4xl">📼</span>
                  )}
                  {video.completeness === "metadata" && (
                    <span className="absolute top-2 right-2 bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.5 font-medium">
                      Cover Only
                    </span>
                  )}
                  <span className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] px-1.5 py-0.5 font-medium">
                    {VIDEO_TYPE_LABELS[video.mediaType]}
                  </span>
                </div>
                <h3 className="font-medium">{video.title}</h3>
                <p className="text-sm text-[#666]">
                  {video.year}
                  {video.runtimeMinutes && ` · ${video.runtimeMinutes} min`}
                </p>
                <p className="mt-1 text-xs text-[#999]">
                  Community submission
                </p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
