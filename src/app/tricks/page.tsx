import { db, tricks, magazineAppearances } from "@/lib/db";
import Link from "next/link";

export default async function TricksPage() {
  const allTricks = db.select().from(tricks).all();
  const allAppearances = db.select().from(magazineAppearances).all();

  const tricksWithCounts = allTricks.map((trick) => {
    const appearances = allAppearances.filter(
      (a) => a.entityType === "trick" && a.entityId === trick.id
    );
    const totalPages = appearances.reduce((sum, a) => {
      const pages = a.pageNumbers as number[] | null;
      return sum + (pages?.length || 0);
    }, 0);
    return { ...trick, magazineCount: appearances.length, totalPages };
  });

  // Sort alphabetically
  const sorted = tricksWithCounts.sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="min-h-screen bg-white text-[#3a3a3a]">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold tracking-tight">Tricks</h1>
          <p className="mt-1 text-[#666]">{sorted.length} tricks indexed</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((trick) => (
            <Link
              key={trick.id}
              href={`/tricks/${trick.id}`}
              className="flex items-center justify-between border border-[#ebebeb] px-4 py-3 transition-colors hover:border-[#3a3a3a]"
            >
              <span className="font-medium">{trick.name}</span>
              <span className="text-sm text-[#999]">
                {trick.magazineCount} mag{trick.magazineCount !== 1 && "s"} · {trick.totalPages} pg{trick.totalPages !== 1 && "s"}
              </span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
