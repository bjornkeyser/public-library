import { db, skaters, spots, photographers, brands, events, tricks, locations, magazineAppearances, trickMentions } from "../src/lib/db";
import { eq } from "drizzle-orm";

// Get all entity IDs that have appearances
const appearances = db.select().from(magazineAppearances).all();

const usedSkaterIds = new Set(appearances.filter(a => a.entityType === "skater").map(a => a.entityId));
const usedSpotIds = new Set(appearances.filter(a => a.entityType === "spot").map(a => a.entityId));
const usedPhotographerIds = new Set(appearances.filter(a => a.entityType === "photographer").map(a => a.entityId));
const usedBrandIds = new Set(appearances.filter(a => a.entityType === "brand").map(a => a.entityId));
const usedEventIds = new Set(appearances.filter(a => a.entityType === "event").map(a => a.entityId));
const usedTrickIds = new Set(appearances.filter(a => a.entityType === "trick").map(a => a.entityId));
const usedLocationIds = new Set(appearances.filter(a => a.entityType === "location").map(a => a.entityId));

// Find unused entities
const allSkaters = db.select().from(skaters).all();
const allSpots = db.select().from(spots).all();
const allPhotographers = db.select().from(photographers).all();
const allBrands = db.select().from(brands).all();
const allEvents = db.select().from(events).all();
const allTricks = db.select().from(tricks).all();
const allLocations = db.select().from(locations).all();

const unusedSkaters = allSkaters.filter(s => !usedSkaterIds.has(s.id));
const unusedSpots = allSpots.filter(s => !usedSpotIds.has(s.id));
const unusedPhotographers = allPhotographers.filter(p => !usedPhotographerIds.has(p.id));
const unusedBrands = allBrands.filter(b => !usedBrandIds.has(b.id));
const unusedEvents = allEvents.filter(e => !usedEventIds.has(e.id));
const unusedTricks = allTricks.filter(t => !usedTrickIds.has(t.id));
const unusedLocations = allLocations.filter(l => !usedLocationIds.has(l.id));

console.log("Entities with 0 magazine appearances:");
console.log(`  Skaters: ${unusedSkaters.length}`);
console.log(`  Spots: ${unusedSpots.length}`);
console.log(`  Photographers: ${unusedPhotographers.length}`);
console.log(`  Brands: ${unusedBrands.length}`);
console.log(`  Events: ${unusedEvents.length}`);
console.log(`  Tricks: ${unusedTricks.length}`);
console.log(`  Locations: ${unusedLocations.length}`);

// Delete unused entities (order matters due to FK constraints)
// trickMentions references: skaters, spots, tricks - delete these first
const allTrickMentions = db.select().from(trickMentions).all();
for (const tm of allTrickMentions) {
  const skaterUnused = tm.skaterId && unusedSkaters.some(s => s.id === tm.skaterId);
  const spotUnused = tm.spotId && unusedSpots.some(s => s.id === tm.spotId);
  const trickUnused = unusedTricks.some(t => t.id === tm.trickId);
  if (skaterUnused || spotUnused || trickUnused) {
    db.delete(trickMentions).where(eq(trickMentions.id, tm.id)).run();
  }
}

// Events reference spots - clear spotId for unused spots
for (const e of db.select().from(events).all()) {
  if (e.spotId && unusedSpots.some(s => s.id === e.spotId)) {
    db.update(events).set({ spotId: null }).where(eq(events.id, e.id)).run();
  }
}

// Now delete spots (references locations)
for (const s of unusedSpots) {
  db.delete(spots).where(eq(spots.id, s.id)).run();
}

// Then: locations (referenced by spots)
for (const l of unusedLocations) {
  // Check if any spot still references this location
  const referencingSpot = db.select().from(spots).all().find(s => s.locationId === l.id);
  if (!referencingSpot) {
    db.delete(locations).where(eq(locations.id, l.id)).run();
  }
}

// Rest can be deleted in any order
for (const s of unusedSkaters) {
  db.delete(skaters).where(eq(skaters.id, s.id)).run();
}
for (const p of unusedPhotographers) {
  db.delete(photographers).where(eq(photographers.id, p.id)).run();
}
for (const b of unusedBrands) {
  db.delete(brands).where(eq(brands.id, b.id)).run();
}
for (const e of unusedEvents) {
  db.delete(events).where(eq(events.id, e.id)).run();
}
for (const t of unusedTricks) {
  db.delete(tricks).where(eq(tricks.id, t.id)).run();
}

const total = unusedSkaters.length + unusedSpots.length + unusedPhotographers.length +
              unusedBrands.length + unusedEvents.length + unusedTricks.length + unusedLocations.length;
console.log(`\nDeleted ${total} unused entities.`);
