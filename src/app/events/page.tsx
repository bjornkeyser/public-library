import { db, events, magazineAppearances } from "@/lib/db";
import Link from "next/link";

export default async function EventsPage() {
  const allEvents = db.select().from(events).all();
  const allAppearances = db.select().from(magazineAppearances).all();

  const eventsWithCounts = allEvents.map((event) => {
    const appearances = allAppearances.filter(
      (a) => a.entityType === "event" && a.entityId === event.id
    );
    const totalPages = appearances.reduce((sum, a) => {
      const pages = a.pageNumbers as number[] | null;
      return sum + (pages?.length || 0);
    }, 0);
    return { ...event, magazineCount: appearances.length, totalPages };
  });

  // Sort alphabetically
  const sorted = eventsWithCounts.sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="min-h-screen bg-white text-[#3a3a3a]">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold tracking-tight">Events</h1>
          <p className="mt-1 text-[#666]">{sorted.length} events indexed</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((event) => (
            <Link
              key={event.id}
              href={`/events/${event.id}`}
              className="flex items-center justify-between border border-[#ebebeb] px-4 py-3 transition-colors hover:border-[#3a3a3a]"
            >
              <div>
                <span className="font-medium">{event.name}</span>
                {event.location && <span className="ml-2 text-sm text-[#666]">{event.location}</span>}
              </div>
              <span className="text-sm text-[#999]">
                {event.magazineCount} mag{event.magazineCount !== 1 && "s"}
              </span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
