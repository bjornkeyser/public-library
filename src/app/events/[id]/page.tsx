import { db, events, magazineAppearances, magazines } from "@/lib/db";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { EntityTimeline } from "@/components/entity-timeline";
import { BackButton } from "@/components/back-button";

type Props = { params: Promise<{ id: string }> };

export default async function EventDetailPage({ params }: Props) {
  const { id } = await params;
  const eventId = parseInt(id, 10);

  const event = db.select().from(events).where(eq(events.id, eventId)).get();
  if (!event) notFound();

  const appearances = db
    .select()
    .from(magazineAppearances)
    .where(eq(magazineAppearances.entityId, eventId))
    .all()
    .filter((a) => a.entityType === "event");

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
          <BackButton fallbackHref="/events" fallbackLabel="All Events" />
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{event.name}</h1>
          <p className="mt-1 text-[#666]">
            {event.location && <>{event.location} · </>}
            {event.date && <>{event.date} · </>}
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
          <h2 className="mb-6 text-lg font-semibold uppercase tracking-wide">Timeline</h2>
          <EntityTimeline items={magazineAppearancesList} entityName={event.name} entityType="event" entityId={eventId} />
        </section>
      </main>
    </div>
  );
}
