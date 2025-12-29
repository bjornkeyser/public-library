import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserCollection } from "@/lib/actions/collection";
import Link from "next/link";

export default async function CollectionPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  const items = await getUserCollection(session.user.id);

  const haveItems = items.filter((i) => i.status === "have");
  const wantItems = items.filter((i) => i.status === "want");
  const hadItems = items.filter((i) => i.status === "had");

  return (
    <div className="min-h-screen bg-white text-[#3a3a3a]">
      <header className="border-b border-[#ebebeb]">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-semibold tracking-tight">My Collection</h1>
          <p className="mt-1 text-[#666]">
            {haveItems.length} have · {wantItems.length} want
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {items.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[#666] mb-4">Your collection is empty.</p>
            <Link
              href="/magazines"
              className="inline-block bg-[#3a3a3a] text-white px-6 py-2 hover:bg-[#555] transition-colors"
            >
              Browse Magazines
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Have Section */}
            {haveItems.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold uppercase tracking-wide mb-4">
                  Have ({haveItems.length})
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {haveItems.map((item) => (
                    <CollectionItem key={item.id} item={item} />
                  ))}
                </div>
              </section>
            )}

            {/* Want Section */}
            {wantItems.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold uppercase tracking-wide mb-4">
                  Want ({wantItems.length})
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {wantItems.map((item) => (
                    <CollectionItem key={item.id} item={item} />
                  ))}
                </div>
              </section>
            )}

            {/* Had Section */}
            {hadItems.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold uppercase tracking-wide mb-4 text-[#999]">
                  Had ({hadItems.length})
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 opacity-60">
                  {hadItems.map((item) => (
                    <CollectionItem key={item.id} item={item} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function CollectionItem({ item }: { item: Awaited<ReturnType<typeof getUserCollection>>[0] }) {
  if (!item.media) return null;

  const media = item.media;
  const displayTitle = media.issue ? `#${media.issue}` : media.title;
  const subtitle = media.month
    ? `${new Date(2000, media.month - 1).toLocaleString("default", { month: "short" })} ${media.year}`
    : String(media.year);

  return (
    <Link
      href={`/magazines/${media.id}`}
      className="group block"
    >
      <div className="aspect-[3/4] bg-[#f6f6f6] border border-[#ebebeb] group-hover:border-[#3a3a3a] transition-colors overflow-hidden">
        {media.coverImage ? (
          <img
            src={media.coverImage}
            alt={`${media.title} ${displayTitle}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#999]">
            No cover
          </div>
        )}
      </div>
      <div className="mt-2">
        <div className="font-medium text-sm group-hover:text-[#666] transition-colors truncate">
          {media.title} {displayTitle}
        </div>
        <div className="text-xs text-[#999]">{subtitle}</div>
        {item.condition && (
          <div className="text-xs text-[#666] mt-0.5">
            {item.condition.replace("_", " ")}
          </div>
        )}
      </div>
    </Link>
  );
}
