import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getUserByUsername,
  getUserCollection,
  getUserRatings,
  getUserContributions,
  getUserStats,
} from "@/lib/actions/profile";

type Props = {
  params: Promise<{ username: string }>;
};

const MEDIA_TYPE_LABELS: Record<string, string> = {
  magazine: "Magazine",
  vhs: "VHS",
  dvd: "DVD",
  bluray: "Blu-ray",
  digital: "Digital",
};

export default async function ProfilePage({ params }: Props) {
  const { username } = await params;
  const user = await getUserByUsername(username);

  if (!user) {
    notFound();
  }

  const [collection, ratings, contributions, stats] = await Promise.all([
    getUserCollection(user.id),
    getUserRatings(user.id),
    getUserContributions(user.id),
    getUserStats(user.id),
  ]);

  const displayName = user.displayName || user.name || user.username;

  return (
    <div className="min-h-screen bg-white text-[#3a3a3a]">
      {/* Profile Header */}
      <header className="border-b border-[#ebebeb]">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            {user.image ? (
              <img
                src={user.image}
                alt=""
                className="w-20 h-20 rounded-full object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-[#3a3a3a] flex items-center justify-center text-white text-2xl font-medium">
                {displayName?.[0]?.toUpperCase() || "U"}
              </div>
            )}

            {/* Info */}
            <div className="flex-1">
              <h1 className="text-2xl font-semibold">{displayName}</h1>
              {user.username && (
                <p className="text-[#666]">@{user.username}</p>
              )}
              {user.bio && (
                <p className="mt-2 text-[#666]">{user.bio}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-[#666]">
                {user.location && (
                  <span>{user.location}</span>
                )}
                {user.createdAt && (
                  <span>
                    Joined {new Date(user.createdAt).toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-6 flex gap-6">
            <div className="text-center">
              <div className="text-2xl font-semibold">{stats.have}</div>
              <div className="text-xs text-[#666] uppercase tracking-wide">Have</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-semibold">{stats.want}</div>
              <div className="text-xs text-[#666] uppercase tracking-wide">Want</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-semibold">{stats.ratings}</div>
              <div className="text-xs text-[#666] uppercase tracking-wide">Ratings</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-semibold">{stats.contributions}</div>
              <div className="text-xs text-[#666] uppercase tracking-wide">Contributions</div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Collection - Have */}
          <section>
            <h2 className="text-lg font-semibold mb-4">
              Collection ({collection.have.length})
            </h2>
            {collection.have.length === 0 ? (
              <p className="text-sm text-[#666]">No items in collection yet.</p>
            ) : (
              <div className="space-y-2">
                {collection.have.slice(0, 10).map((item) => (
                  <Link
                    key={item.id}
                    href={`/media/${item.mediaId}`}
                    className="flex items-center gap-3 p-2 border border-[#ebebeb] hover:border-[#3a3a3a] transition-colors"
                  >
                    <div className="w-10 h-14 bg-[#f6f6f6] flex-shrink-0 overflow-hidden">
                      {item.mediaCover ? (
                        <img
                          src={item.mediaCover}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs">
                          {item.mediaType === "magazine" ? "📰" : "📼"}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{item.mediaTitle}</div>
                      <div className="text-xs text-[#666]">
                        {MEDIA_TYPE_LABELS[item.mediaType]} · {item.mediaYear}
                      </div>
                    </div>
                  </Link>
                ))}
                {collection.have.length > 10 && (
                  <p className="text-sm text-[#666] pt-2">
                    +{collection.have.length - 10} more items
                  </p>
                )}
              </div>
            )}
          </section>

          {/* Wantlist */}
          <section>
            <h2 className="text-lg font-semibold mb-4">
              Wantlist ({collection.want.length})
            </h2>
            {collection.want.length === 0 ? (
              <p className="text-sm text-[#666]">No items in wantlist yet.</p>
            ) : (
              <div className="space-y-2">
                {collection.want.slice(0, 10).map((item) => (
                  <Link
                    key={item.id}
                    href={`/media/${item.mediaId}`}
                    className="flex items-center gap-3 p-2 border border-[#ebebeb] hover:border-[#3a3a3a] transition-colors"
                  >
                    <div className="w-10 h-14 bg-[#f6f6f6] flex-shrink-0 overflow-hidden">
                      {item.mediaCover ? (
                        <img
                          src={item.mediaCover}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs">
                          {item.mediaType === "magazine" ? "📰" : "📼"}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{item.mediaTitle}</div>
                      <div className="text-xs text-[#666]">
                        {MEDIA_TYPE_LABELS[item.mediaType]} · {item.mediaYear}
                      </div>
                    </div>
                  </Link>
                ))}
                {collection.want.length > 10 && (
                  <p className="text-sm text-[#666] pt-2">
                    +{collection.want.length - 10} more items
                  </p>
                )}
              </div>
            )}
          </section>

          {/* Ratings */}
          <section>
            <h2 className="text-lg font-semibold mb-4">
              Ratings ({ratings.length})
            </h2>
            {ratings.length === 0 ? (
              <p className="text-sm text-[#666]">No ratings yet.</p>
            ) : (
              <div className="space-y-2">
                {ratings.slice(0, 10).map((item) => (
                  <Link
                    key={item.id}
                    href={`/media/${item.mediaId}`}
                    className="flex items-center gap-3 p-2 border border-[#ebebeb] hover:border-[#3a3a3a] transition-colors"
                  >
                    <div className="w-10 h-14 bg-[#f6f6f6] flex-shrink-0 overflow-hidden">
                      {item.mediaCover ? (
                        <img
                          src={item.mediaCover}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs">
                          {item.mediaType === "magazine" ? "📰" : "📼"}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{item.mediaTitle}</div>
                      <div className="text-xs text-[#666]">
                        <span className="text-amber-400">
                          {"★".repeat(item.rating || 0)}
                          {"☆".repeat(5 - (item.rating || 0))}
                        </span>
                        {item.review && (
                          <span className="ml-2 text-[#999]">
                            "{item.review.slice(0, 50)}{item.review.length > 50 ? "..." : ""}"
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
                {ratings.length > 10 && (
                  <p className="text-sm text-[#666] pt-2">
                    +{ratings.length - 10} more ratings
                  </p>
                )}
              </div>
            )}
          </section>

          {/* Contributions */}
          <section>
            <h2 className="text-lg font-semibold mb-4">
              Contributions ({contributions.length})
            </h2>
            {contributions.length === 0 ? (
              <p className="text-sm text-[#666]">No contributions yet.</p>
            ) : (
              <div className="space-y-2">
                {contributions.slice(0, 10).map((item) => (
                  <Link
                    key={item.id}
                    href={`/media/${item.id}`}
                    className="flex items-center gap-3 p-2 border border-[#ebebeb] hover:border-[#3a3a3a] transition-colors"
                  >
                    <div className="w-10 h-14 bg-[#f6f6f6] flex-shrink-0 overflow-hidden">
                      {item.coverImage ? (
                        <img
                          src={item.coverImage}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs">
                          {item.mediaType === "magazine" ? "📰" : "📼"}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{item.title}</div>
                      <div className="text-xs text-[#666]">
                        {MEDIA_TYPE_LABELS[item.mediaType]} · {item.year}
                        {item.status !== "published" && (
                          <span className={`ml-2 ${
                            item.status === "pending" ? "text-amber-600" : "text-red-600"
                          }`}>
                            ({item.status})
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
                {contributions.length > 10 && (
                  <p className="text-sm text-[#666] pt-2">
                    +{contributions.length - 10} more contributions
                  </p>
                )}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
