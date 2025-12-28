import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";
import path from "path";

// Database path
const dbPath = path.join(process.cwd(), "data", "skate-mag.db");
const sqlite = new Database(dbPath);
sqlite.pragma("foreign_keys = ON");
const db = drizzle(sqlite, { schema });

function seed() {
  console.log("Seeding database with Thrasher Vol.1 #1 data...\n");

  // Clear existing data (order matters due to foreign keys)
  sqlite.exec("DELETE FROM magazine_appearances");
  sqlite.exec("DELETE FROM magazine_pages");
  sqlite.exec("DELETE FROM events");
  sqlite.exec("DELETE FROM brands");
  sqlite.exec("DELETE FROM photographers");
  sqlite.exec("DELETE FROM spots");
  sqlite.exec("DELETE FROM skaters");
  sqlite.exec("DELETE FROM magazines");

  // Insert magazine
  const magazines = db
    .insert(schema.magazines)
    .values({
      title: "Thrasher",
      volume: 1,
      issue: 1,
      year: 1981,
      month: 1,
      pdfPath: "/magazines/TH1981_01.pdf",
      status: "review",
    })
    .returning()
    .all();
  const magazine = magazines[0];

  console.log(`Created magazine: ${magazine.title} Vol.${magazine.volume} #${magazine.issue}`);

  // Insert skaters from the magazine
  const skaterData = [
    { name: "Steve Caballero", hometown: "San Jose, CA" },
    { name: "Duane Peters", aliases: ["D.P.", "Master of Disaster"] },
    { name: "Tony Alva", aliases: ["T.A."] },
    { name: "Mike McGill" },
    { name: "Eddie Elguera" },
    { name: "Steve Olson" },
    { name: "Christian Hosoi" },
    { name: "Tony Hawk" },
    { name: "Lance Mountain" },
    { name: "Neil Blender" },
    { name: "Micke Alba", aliases: ["Mike Alba"] },
    { name: "Steve Alba", aliases: ["Salba"] },
    { name: "David Andrecht" },
    { name: "Mike Folmer" },
    { name: "Bert LaMar" },
    { name: "Alan Losi" },
    { name: "Mike Smith" },
    { name: "Eric Grisham" },
    { name: "Ray Rodriguez", aliases: ["Ray 'Bones' Rodriguez", "Bones"] },
    { name: "Wally Inouye" },
    { name: "John Gibson" },
    { name: "Billy Ruff" },
    { name: "Mike Stelmasky" },
    { name: "Kenny Stelmasky" },
    { name: "Dennis Agnew", aliases: ["Polar Bear", "Dennis 'Polar Bear' Agnew"] },
    { name: "John Hutson" },
    { name: "Roger Hickey" },
    { name: "Paco Prieto" },
    { name: "Byron Miller" },
    { name: "Rick Blackhart" },
    { name: "Chris Strople" },
    { name: "Brad Bowman" },
    { name: "Burt LaMar" },
    { name: "Geno Tocci", aliases: ["Freddy de Soto"] },
    { name: "Steve Hirsch" },
    { name: "Bob Serafin" },
    { name: "Pat Ngoho" },
    { name: "Jim Gray" },
    { name: "Eddie Meek" },
    { name: "Carabeth Burnside" },
    { name: "Sue Smith" },
    { name: "Joanna Field" },
    { name: "Pattie Hoffman" },
    { name: "Denise Danielson" },
    { name: "Cindy Whitehead" },
    { name: "Gale Webb" },
    { name: "Leigh Parkins" },
    { name: "Kim Adrien" },
  ];

  const skaters = db
    .insert(schema.skaters)
    .values(skaterData.map(s => ({ ...s, aliases: s.aliases || [] })))
    .returning()
    .all();

  console.log(`Created ${skaters.length} skaters`);

  // Insert spots
  const spotData = [
    { name: "Upland Pipeline", aliases: ["The Pipeline", "Combi Pool"], city: "Upland", state: "CA", type: "park" as const },
    { name: "Marina Skatepark", city: "Marina del Rey", state: "CA", type: "park" as const },
    { name: "Del Mar Skate Ranch", city: "Del Mar", state: "CA", type: "park" as const },
    { name: "Laguna Seca Raceway", city: "Monterey", state: "CA", type: "other" as const },
    { name: "Apple Skatepark", city: "Columbus", state: "OH", type: "park" as const },
    { name: "Kona Skatepark", aliases: ["Kona USA"], city: "Jacksonville", state: "FL", type: "park" as const },
    { name: "Sensation Basin", city: "Gainesville", state: "FL", type: "park" as const },
    { name: "Capitola", city: "Capitola", state: "CA", type: "other" as const },
    { name: "Oasis Skatepark", aliases: ["Big 'O'"], city: "San Diego", state: "CA", type: "park" as const },
    { name: "Colton Skatepark", city: "Colton", state: "CA", type: "park" as const },
    { name: "San Francisco Curbs", city: "San Francisco", state: "CA", type: "street" as const },
    { name: "Skate City Whittier", city: "Whittier", state: "CA", type: "park" as const },
  ];

  const spots = db
    .insert(schema.spots)
    .values(spotData.map(s => ({ ...s, aliases: s.aliases || [] })))
    .returning()
    .all();

  console.log(`Created ${spots.length} spots`);

  // Insert photographers
  const photographerData = [
    { name: "Kevin J. Thatcher", aliases: ["KT"] },
    { name: "Reginald Caselli Jr." },
    { name: "Grant Brittain" },
    { name: "Rusty Harris" },
    { name: "Richard Rose" },
    { name: "Paul Woodridge" },
    { name: "Dudley Counts" },
  ];

  const photographers = db
    .insert(schema.photographers)
    .values(photographerData.map(p => ({ ...p, aliases: p.aliases || [] })))
    .returning()
    .all();

  console.log(`Created ${photographers.length} photographers`);

  // Insert brands
  const brandData = [
    { name: "Santa Cruz", category: "decks" as const },
    { name: "Z-Flex", aliases: ["Z-Products"], category: "decks" as const },
    { name: "Independent", aliases: ["Indy"], category: "trucks" as const },
    { name: "Madrid", category: "decks" as const },
    { name: "Sims", category: "decks" as const },
    { name: "Variflex", category: "decks" as const },
    { name: "Powell-Peralta", aliases: ["Powell"], category: "decks" as const },
    { name: "G&S", aliases: ["Gordon & Smith"], category: "decks" as const },
    { name: "Tracker", category: "trucks" as const },
    { name: "Gullwing", aliases: ["Gull Wing"], category: "trucks" as const },
    { name: "Kryptonics", aliases: ["Krypto"], category: "wheels" as const },
    { name: "Norcon", category: "accessories" as const },
    { name: "Mad Rats", category: "clothing" as const },
    { name: "Vans", category: "shoes" as const },
    { name: "Rector", category: "accessories" as const },
    { name: "Action Now", category: "other" as const },
    { name: "N.M.B.", aliases: ["NMB Precision Bearings"], category: "bearings" as const },
    { name: "Val Surf", category: "shop" as const },
    { name: "Gyro", category: "wheels" as const },
    { name: "Dogtown", aliases: ["DTS"], category: "decks" as const },
  ];

  const brands = db
    .insert(schema.brands)
    .values(brandData.map(b => ({ ...b, aliases: b.aliases || [] })))
    .returning()
    .all();

  console.log(`Created ${brands.length} brands`);

  // Insert events
  const eventData = [
    { name: "Gold Cup Finals", date: "1980-11", location: "Upland Pipeline" },
    { name: "Capitola Downhill", date: "1980-08-30", location: "Capitola, CA" },
    { name: "Laguna Seca Downhill", date: "1980-09-20", location: "Laguna Seca Raceway" },
    { name: "Pepsi Team Challenge", date: "1980-11", location: "Sensation Basin, FL" },
  ];

  const events = db.insert(schema.events).values(eventData).returning().all();

  console.log(`Created ${events.length} events`);

  // Create some sample appearances (linking skaters to this magazine)
  const skaterMap = new Map(skaters.map(s => [s.name, s.id]));
  const spotMap = new Map(spots.map(s => [s.name, s.id]));
  const photographerMap = new Map(photographers.map(p => [p.name, p.id]));
  const brandMap = new Map(brands.map(b => [b.name, b.id]));

  const appearanceData = [
    // Cover & featured skaters
    { entityType: "skater" as const, entityId: skaterMap.get("Steve Caballero")!, pageNumbers: [1, 10, 11, 14, 15], context: "cover" as const, verified: true },
    { entityType: "skater" as const, entityId: skaterMap.get("Duane Peters")!, pageNumbers: [2, 10, 11, 12], context: "feature" as const, verified: true },
    { entityType: "skater" as const, entityId: skaterMap.get("Tony Alva")!, pageNumbers: [16, 18], context: "feature" as const, verified: true },
    { entityType: "skater" as const, entityId: skaterMap.get("Eddie Elguera")!, pageNumbers: [10, 11, 14, 15], context: "contest_results" as const, verified: true },
    { entityType: "skater" as const, entityId: skaterMap.get("Mike McGill")!, pageNumbers: [10, 11, 13, 14, 15], context: "contest_results" as const, verified: true },
    { entityType: "skater" as const, entityId: skaterMap.get("Christian Hosoi")!, pageNumbers: [12, 14, 15], context: "contest_results" as const, verified: true },
    { entityType: "skater" as const, entityId: skaterMap.get("Tony Hawk")!, pageNumbers: [14], context: "contest_results" as const, verified: true },
    { entityType: "skater" as const, entityId: skaterMap.get("Steve Olson")!, pageNumbers: [2], context: "ad" as const, verified: true },

    // Spots
    { entityType: "spot" as const, entityId: spotMap.get("Upland Pipeline")!, pageNumbers: [10, 11, 12, 13, 14, 15], context: "feature" as const, verified: true },
    { entityType: "spot" as const, entityId: spotMap.get("Laguna Seca Raceway")!, pageNumbers: [18, 19, 20, 21], context: "feature" as const, verified: true },
    { entityType: "spot" as const, entityId: spotMap.get("Marina Skatepark")!, pageNumbers: [2], context: "ad" as const, verified: true },

    // Photographers
    { entityType: "photographer" as const, entityId: photographerMap.get("Grant Brittain")!, pageNumbers: [2], context: "photo" as const, verified: true },
    { entityType: "photographer" as const, entityId: photographerMap.get("Kevin J. Thatcher")!, pageNumbers: [3], context: "other" as const, verified: true },

    // Brands (ads)
    { entityType: "brand" as const, entityId: brandMap.get("Santa Cruz")!, pageNumbers: [2], context: "ad" as const, verified: true },
    { entityType: "brand" as const, entityId: brandMap.get("Z-Flex")!, pageNumbers: [2], context: "ad" as const, verified: true },
    { entityType: "brand" as const, entityId: brandMap.get("Independent")!, pageNumbers: [3], context: "ad" as const, verified: true },
    { entityType: "brand" as const, entityId: brandMap.get("Madrid")!, pageNumbers: [3], context: "ad" as const, verified: true },
    { entityType: "brand" as const, entityId: brandMap.get("Mad Rats")!, pageNumbers: [4], context: "ad" as const, verified: true },
    { entityType: "brand" as const, entityId: brandMap.get("Sims")!, pageNumbers: [17], context: "ad" as const, verified: true },
  ];

  const appearances = db
    .insert(schema.magazineAppearances)
    .values(appearanceData.map(a => ({ ...a, magazineId: magazine.id, confidenceScore: 1.0 })))
    .returning()
    .all();

  console.log(`Created ${appearances.length} appearances`);

  console.log("\nSeed complete!");
}

seed();
