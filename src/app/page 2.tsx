import { db, magazines, skaters, spots, photographers, brands, tricks, events } from "@/lib/db";
import Link from "next/link";
import { SearchFilters } from "@/components/search-filters";
import { MagazineStack } from "@/components/magazine-stack";

export default async function Home() {
  // Get all data
  const allMagazines = db.select().from(magazines).all();
  const allSkaters = db.select().from(skaters).all();
  const allSpots = db.select().from(spots).all();
  const allPhotographers = db.select().from(photographers).all();
  const allBrands = db.select().from(brands).all();
  const allTricks = db.select().from(tricks).all();
  const allEvents = db.select().from(events).all();

  // Build entity list for autocomplete
  const entityOptions = [
    ...allSkaters.map(s => ({ type: "skater", id: s.id, name: s.name })),
    ...allSpots.map(s => ({ type: "spot", id: s.id, name: s.name })),
    ...allPhotographers.map(p => ({ type: "photographer", id: p.id, name: p.name })),
    ...allBrands.map(b => ({ type: "brand", id: b.id, name: b.name })),
    ...allTricks.map(t => ({ type: "trick", id: t.id, name: t.name })),
    ...allEvents.map(e => ({ type: "event", id: e.id, name: e.name })),
  ].sort((a, b) => a.name.localeCompare(b.name));

  // Get unique magazine titles
  const uniqueMagazines = [...new Set(allMagazines.map(m => m.title))].sort();

  // Get year range
  const years = allMagazines.map(m => m.year).filter(y => y != null);
  const yearRange = {
    min: years.length > 0 ? Math.min(...years) : 1980,
    max: years.length > 0 ? Math.max(...years) : 2024,
  };

  // Get counts
  const magazineCount = allMagazines.length;
  const skaterCount = allSkaters.length;
  const spotCount = allSpots.length;
  const photographerCount = allPhotographers.length;
  const brandCount = allBrands.length;
  const trickCount = allTricks.length;
  const eventCount = allEvents.length;

  // Get magazines with covers for the stack
  const magazinesWithCovers = allMagazines
    .sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return (b.month || 0) - (a.month || 0);
    })
    .filter((m) => m.coverImage)
    .slice(0, 12);

  return (
    <div className="min-h-screen bg-white text-[#3a3a3a]">
      <main className="container mx-auto px-4 py-8">
        {/* Tagline */}
        <p className="mb-8 text-[#666]">
          Search vintage skate magazines by skaters, spots, photographers & more
        </p>
        {/* Search */}
        <section className="mb-12">
          <SearchFilters
            entities={entityOptions}
            magazines={uniqueMagazines}
            yearRange={yearRange}
          />
        </section>

        {/* Magazine Stack */}
        <section className="mb-12">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold uppercase tracking-wide">Browse Issues</h2>
            <Link href="/magazines" className="text-sm text-[#999] hover:text-[#3a3a3a]">
              View all →
            </Link>
          </div>
          <MagazineStack magazines={magazinesWithCovers} />
        </section>

        {/* Stats */}
        <section className="mb-12 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
          <StatCard label="Magazines" count={magazineCount} href="/magazines" />
          <StatCard label="Skaters" count={skaterCount} href="/skaters" />
          <StatCard label="Spots" count={spotCount} href="/spots" />
          <StatCard label="Photographers" count={photographerCount} href="/photographers" />
          <StatCard label="Brands" count={brandCount} href="/brands" />
          <StatCard label="Tricks" count={trickCount} href="/tricks" />
          <StatCard label="Events" count={eventCount} href="/events" />
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-[#ebebeb] bg-[#f6f6f6]">
        <div className="container mx-auto px-4 py-8 text-center text-sm text-[#999]">
          Skate Mag Archive — Preserving skateboard history
        </div>
      </footer>
    </div>
  );
}

function StatCard({ label, count, href }: { label: string; count: number; href: string }) {
  return (
    <Link
      href={href}
      className="border border-[#ebebeb] p-4 transition-colors hover:border-[#3a3a3a]"
    >
      <div className="text-3xl font-semibold">{count}</div>
      <div className="text-sm text-[#666] uppercase tracking-wide">{label}</div>
    </Link>
  );
}
