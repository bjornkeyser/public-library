import { db, photographers, magazineAppearances } from "@/lib/db";
import Link from "next/link";

export default async function PhotographersPage() {
  const allPhotographers = db.select().from(photographers).all();
  const allAppearances = db.select().from(magazineAppearances).all();

  const photographersWithCounts = allPhotographers.map((photographer) => {
    const appearances = allAppearances.filter(
      (a) => a.entityType === "photographer" && a.entityId === photographer.id
    );
    const totalPages = appearances.reduce((sum, a) => {
      const pages = a.pageNumbers as number[] | null;
      return sum + (pages?.length || 0);
    }, 0);
    return { ...photographer, magazineCount: appearances.length, totalPages };
  });

  // Sort alphabetically
  const sorted = photographersWithCounts.sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="min-h-screen bg-white text-[#3a3a3a]">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold tracking-tight">Photographers</h1>
          <p className="mt-1 text-[#666]">{sorted.length} photographers indexed</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((photographer) => (
            <Link
              key={photographer.id}
              href={`/photographers/${photographer.id}`}
              className="flex items-center justify-between border border-[#ebebeb] px-4 py-3 text-[#3a3a3a] transition-colors hover:border-[#3a3a3a]"
            >
              <span className="font-medium">{photographer.name}</span>
              <span className="text-sm text-[#666]">
                {photographer.magazineCount} mag{photographer.magazineCount !== 1 && "s"}
              </span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
