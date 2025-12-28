import { db, locations, magazineAppearances, magazines } from "@/lib/db";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { EntityTimeline } from "@/components/entity-timeline";
import { BackButton } from "@/components/back-button";

type Props = { params: Promise<{ id: string }> };

export default async function LocationDetailPage({ params }: Props) {
  const { id } = await params;
  const locationId = parseInt(id, 10);

  const location = db.select().from(locations).where(eq(locations.id, locationId)).get();
  if (!location) notFound();

  const appearances = db
    .select()
    .from(magazineAppearances)
    .where(eq(magazineAppearances.entityId, locationId))
    .all()
    .filter((a) => a.entityType === "location");

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

  // Build location details
  const details: { label: string; value: string }[] = [];
  if (location.type) details.push({ label: "Type", value: location.type });
  if (location.address) details.push({ label: "Address", value: location.address });
  if (location.streetNumber && location.streetName) {
    details.push({ label: "Street", value: `${location.streetNumber} ${location.streetName}` });
  } else if (location.streetName) {
    details.push({ label: "Street", value: location.streetName });
  }
  if (location.neighborhood) details.push({ label: "Neighborhood", value: location.neighborhood });
  if (location.city) details.push({ label: "City", value: location.city });
  if (location.state) details.push({ label: "State", value: location.state });
  if (location.country && location.country !== "USA") details.push({ label: "Country", value: location.country });
  if (location.zipcode) details.push({ label: "Zipcode", value: location.zipcode });
  if (location.latitude && location.longitude) {
    details.push({ label: "Coordinates", value: `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}` });
  }

  const hasCoords = location.latitude && location.longitude;

  return (
    <div className="min-h-screen bg-white text-[#3a3a3a]">
      <header className="border-b border-[#ebebeb]">
        <div className="container mx-auto px-4 py-6">
          <BackButton fallbackHref="/locations" fallbackLabel="All Locations" />
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{location.name}</h1>
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
        {/* Location details */}
        {(details.length > 0 || hasCoords) && (
          <section className="mb-8">
            <h2 className="mb-4 text-lg font-semibold uppercase tracking-wide">Details</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {details.map((detail) => (
                <div key={detail.label} className="border border-[#ebebeb] px-4 py-3">
                  <span className="text-xs uppercase tracking-wide text-[#999]">{detail.label}</span>
                  <div className="font-medium">{detail.value}</div>
                </div>
              ))}
              {hasCoords && (
                <Link
                  href={`/map?focus=location-${location.id}`}
                  className="border border-[#ebebeb] px-4 py-3 hover:border-[#3a3a3a] transition-colors"
                >
                  <span className="text-xs uppercase tracking-wide text-[#999]">Map</span>
                  <div className="font-medium">View on Map →</div>
                </Link>
              )}
            </div>

            {/* Mini map preview */}
            {hasCoords && (
              <div className="mt-4">
                <Link
                  href={`/map?focus=location-${location.id}`}
                  className="block border border-[#ebebeb] hover:border-[#3a3a3a] transition-colors overflow-hidden bg-[#f6f6f6] h-[120px] flex items-center justify-center"
                >
                  <div className="text-center">
                    <div className="text-sm font-medium text-[#3a3a3a]">View on Interactive Map →</div>
                    <div className="text-xs text-[#999] mt-1">{location.latitude!.toFixed(4)}, {location.longitude!.toFixed(4)}</div>
                  </div>
                </Link>
              </div>
            )}
          </section>
        )}

        <section>
          <h2 className="mb-6 text-lg font-semibold uppercase tracking-wide">Timeline</h2>
          <EntityTimeline items={magazineAppearancesList} entityName={location.name} entityType="location" entityId={locationId} />
        </section>
      </main>
    </div>
  );
}
