import { db, magazines, magazineAppearances } from "@/lib/db";
import { desc } from "drizzle-orm";
import Link from "next/link";

export default async function MagazinesPage() {
  const allMagazines = db
    .select()
    .from(magazines)
    .orderBy(desc(magazines.year), desc(magazines.month))
    .all();

  const allAppearances = db.select().from(magazineAppearances).all();

  const magazinesWithCounts = allMagazines.map((mag) => {
    const appearances = allAppearances.filter((a) => a.magazineId === mag.id);
    const skaterCount = appearances.filter((a) => a.entityType === "skater").length;
    const totalEntities = appearances.length;
    return { ...mag, skaterCount, totalEntities };
  });

  return (
    <div className="min-h-screen bg-white text-[#3a3a3a]">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold tracking-tight">Magazines</h1>
          <p className="mt-1 text-[#666]">{magazinesWithCounts.length} issues indexed</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {magazinesWithCounts.map((mag) => (
            <Link
              key={mag.id}
              href={`/magazines/${mag.id}`}
              className="group border border-[#ebebeb] p-4 transition-colors hover:border-[#3a3a3a]"
            >
              <div className="mb-3 aspect-[3/4] bg-[#f6f6f6] flex items-center justify-center overflow-hidden">
                {mag.coverImage ? (
                  <img src={mag.coverImage} alt={`${mag.title} cover`} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-4xl">📰</span>
                )}
              </div>
              <h3 className="font-medium">{mag.title}</h3>
              <p className="text-sm text-[#666]">
                {mag.volume && `Vol. ${mag.volume}`}
                {mag.issue && ` #${mag.issue}`}
                {" · "}
                {mag.month && new Date(2000, mag.month - 1).toLocaleString("default", { month: "short" })}{" "}
                {mag.year}
              </p>
              <p className="mt-1 text-xs text-[#999]">
                {mag.skaterCount} skaters · {mag.totalEntities} total entities
              </p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
