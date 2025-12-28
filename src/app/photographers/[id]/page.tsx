import { db, photographers, magazineAppearances, magazines } from "@/lib/db";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { EntityTimeline } from "@/components/entity-timeline";
import { BackButton } from "@/components/back-button";

type Props = { params: Promise<{ id: string }> };

export default async function PhotographerDetailPage({ params }: Props) {
  const { id } = await params;
  const photographerId = parseInt(id, 10);

  const photographer = db.select().from(photographers).where(eq(photographers.id, photographerId)).get();
  if (!photographer) notFound();

  const appearances = db
    .select()
    .from(magazineAppearances)
    .where(eq(magazineAppearances.entityId, photographerId))
    .all()
    .filter((a) => a.entityType === "photographer");

  const allMagazines = db.select().from(magazines).all();

  const magazineAppearancesList = appearances.map((a) => {
    const mag = allMagazines.find((m) => m.id === a.magazineId);
    const pageNums = a.pageNumbers as number[] | null;
    return { appearance: a, magazine: mag, pageCount: pageNums?.length || 0 };
  }).filter((a) => a.magazine);

  const totalPages = magazineAppearancesList.reduce((sum, m) => sum + m.pageCount, 0);

  // Get year range
  const years = magazineAppearancesList.map((a) => a.magazine!.year);
  const minYear = years.length > 0 ? Math.min(...years) : null;
  const maxYear = years.length > 0 ? Math.max(...years) : null;

  return (
    <div className="min-h-screen bg-white text-[#3a3a3a]">
      <header className="border-b border-[#ebebeb]">
        <div className="container mx-auto px-4 py-6">
          <BackButton fallbackHref="/photographers" fallbackLabel="All Photographers" />
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{photographer.name}</h1>
          <p className="mt-1 text-[#666]">
            {magazineAppearancesList.length} magazine{magazineAppearancesList.length !== 1 && "s"} · {totalPages} page{totalPages !== 1 && "s"}
            {minYear && maxYear && (
              <span className="ml-2">
                · {minYear === maxYear ? minYear : `${minYear}–${maxYear}`}
              </span>
            )}
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <section>
          <h2 className="mb-6 text-lg font-semibold uppercase tracking-wide">Photo Credits</h2>
          <EntityTimeline items={magazineAppearancesList} entityName={photographer.name} entityType="photographer" entityId={photographerId} />
        </section>
      </main>
    </div>
  );
}
