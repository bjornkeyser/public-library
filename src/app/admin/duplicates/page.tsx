import { db, skaters, spots, photographers, brands, events, tricks, locations, magazineAppearances } from "@/lib/db";
import Link from "next/link";
import { DuplicatesList } from "./duplicates-list";

// Simple string similarity (Levenshtein-based)
function similarity(a: string, b: string): number {
  const aLower = a.toLowerCase().trim();
  const bLower = b.toLowerCase().trim();

  if (aLower === bLower) return 1;

  const longer = aLower.length > bLower.length ? aLower : bLower;
  const shorter = aLower.length > bLower.length ? bLower : aLower;

  if (longer.length === 0) return 1;

  // Check if one contains the other
  if (longer.includes(shorter) || shorter.includes(longer)) {
    return 0.8 + (shorter.length / longer.length) * 0.2;
  }

  // Levenshtein distance
  const costs: number[] = [];
  for (let i = 0; i <= aLower.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= bLower.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (aLower.charAt(i - 1) !== bLower.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[bLower.length] = lastValue;
  }

  return (longer.length - costs[bLower.length]) / longer.length;
}

interface Entity {
  id: number;
  name: string;
  appearanceCount: number;
}

interface DuplicateGroup {
  entities: Entity[];
  similarityScore: number;
}

function findDuplicates(entities: Entity[], threshold = 0.7): DuplicateGroup[] {
  const groups: DuplicateGroup[] = [];
  const used = new Set<number>();

  for (let i = 0; i < entities.length; i++) {
    if (used.has(entities[i].id)) continue;

    const group: Entity[] = [entities[i]];
    let maxSimilarity = 0;

    for (let j = i + 1; j < entities.length; j++) {
      if (used.has(entities[j].id)) continue;

      const sim = similarity(entities[i].name, entities[j].name);
      if (sim >= threshold) {
        group.push(entities[j]);
        maxSimilarity = Math.max(maxSimilarity, sim);
        used.add(entities[j].id);
      }
    }

    if (group.length > 1) {
      used.add(entities[i].id);
      groups.push({ entities: group, similarityScore: maxSimilarity });
    }
  }

  return groups.sort((a, b) => b.similarityScore - a.similarityScore);
}

export default async function DuplicatesPage() {
  const appearances = db.select().from(magazineAppearances).all();

  // Count appearances per entity
  function countAppearances(entityType: string, entityId: number): number {
    return appearances.filter(a => a.entityType === entityType && a.entityId === entityId).length;
  }

  // Build entity lists with counts
  const skaterList: Entity[] = db.select().from(skaters).all().map(s => ({
    id: s.id, name: s.name, appearanceCount: countAppearances("skater", s.id)
  }));
  const spotList: Entity[] = db.select().from(spots).all().map(s => ({
    id: s.id, name: s.name, appearanceCount: countAppearances("spot", s.id)
  }));
  const photographerList: Entity[] = db.select().from(photographers).all().map(p => ({
    id: p.id, name: p.name, appearanceCount: countAppearances("photographer", p.id)
  }));
  const brandList: Entity[] = db.select().from(brands).all().map(b => ({
    id: b.id, name: b.name, appearanceCount: countAppearances("brand", b.id)
  }));
  const eventList: Entity[] = db.select().from(events).all().map(e => ({
    id: e.id, name: e.name, appearanceCount: countAppearances("event", e.id)
  }));
  const trickList: Entity[] = db.select().from(tricks).all().map(t => ({
    id: t.id, name: t.name, appearanceCount: countAppearances("trick", t.id)
  }));
  const locationList: Entity[] = db.select().from(locations).all().map(l => ({
    id: l.id, name: l.name, appearanceCount: countAppearances("location", l.id)
  }));

  // Find duplicates for each type
  const duplicates = {
    skaters: findDuplicates(skaterList),
    spots: findDuplicates(spotList),
    photographers: findDuplicates(photographerList),
    brands: findDuplicates(brandList),
    events: findDuplicates(eventList),
    tricks: findDuplicates(trickList),
    locations: findDuplicates(locationList),
  };

  const totalGroups = Object.values(duplicates).reduce((sum, groups) => sum + groups.length, 0);

  return (
    <div className="min-h-screen bg-white text-[#3a3a3a]">
      <header className="border-b border-[#ebebeb]">
        <div className="container mx-auto px-4 py-6">
          <Link href="/admin" className="text-sm text-[#666] hover:text-[#3a3a3a]">
            ← Admin
          </Link>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Duplicate Detection</h1>
          <p className="mt-1 text-[#666]">
            {totalGroups} potential duplicate group{totalGroups !== 1 && "s"} found
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <DuplicatesList duplicates={duplicates} />
      </main>
    </div>
  );
}
