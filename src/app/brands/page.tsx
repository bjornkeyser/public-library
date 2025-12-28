import { db, brands, magazineAppearances } from "@/lib/db";
import Link from "next/link";

export default async function BrandsPage() {
  const allBrands = db.select().from(brands).all();
  const allAppearances = db.select().from(magazineAppearances).all();

  const brandsWithCounts = allBrands.map((brand) => {
    const appearances = allAppearances.filter(
      (a) => a.entityType === "brand" && a.entityId === brand.id
    );
    const totalPages = appearances.reduce((sum, a) => {
      const pages = a.pageNumbers as number[] | null;
      return sum + (pages?.length || 0);
    }, 0);
    return { ...brand, magazineCount: appearances.length, totalPages };
  });

  // Sort alphabetically
  const sorted = brandsWithCounts.sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="min-h-screen bg-white text-[#3a3a3a]">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold tracking-tight">Brands</h1>
          <p className="mt-1 text-[#666]">{sorted.length} brands indexed</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((brand) => (
            <Link
              key={brand.id}
              href={`/brands/${brand.id}`}
              className="flex items-center justify-between border border-[#ebebeb] px-4 py-3 text-[#3a3a3a] transition-colors hover:border-[#3a3a3a]"
            >
              <div>
                <span className="font-medium">{brand.name}</span>
                {brand.category && <span className="ml-2 text-xs text-[#666]">({brand.category})</span>}
              </div>
              <span className="text-sm text-[#666]">
                {brand.magazineCount} mag{brand.magazineCount !== 1 && "s"}
              </span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
