import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

// Magazine - the core entity representing a single issue
export const magazines = sqliteTable("magazines", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(), // e.g., "Thrasher", "Transworld"
  volume: integer("volume"),
  issue: integer("issue"),
  year: integer("year").notNull(),
  month: integer("month"), // 1-12
  coverImage: text("cover_image"), // path to cover image
  pdfPath: text("pdf_path"), // path to PDF file
  status: text("status", { enum: ["pending", "processing", "review", "published"] })
    .notNull()
    .default("pending"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// Magazine pages - stores extracted text and thumbnail per page
export const magazinePages = sqliteTable("magazine_pages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  magazineId: integer("magazine_id")
    .notNull()
    .references(() => magazines.id, { onDelete: "cascade" }),
  pageNumber: integer("page_number").notNull(),
  imagePath: text("image_path"), // path to page thumbnail
  textContent: text("text_content"), // extracted text
});

// Skaters
export const skaters = sqliteTable("skaters", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  aliases: text("aliases", { mode: "json" }).$type<string[]>().default([]),
  hometown: text("hometown"),
  stance: text("stance", { enum: ["regular", "goofy", "unknown"] }),
  activeYearsStart: integer("active_years_start"),
  activeYearsEnd: integer("active_years_end"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// Locations - cities, regions, addresses mentioned in magazines
// Defined before spots so spots can reference it
export const locations = sqliteTable("locations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(), // The name as mentioned ("San Francisco", "Downtown LA", "3rd & Army")
  type: text("type", {
    enum: ["city", "state", "country", "region", "neighborhood", "street", "address", "zipcode", "other"]
  }),
  // Normalized location components
  streetName: text("street_name"),
  streetNumber: text("street_number"),
  address: text("address"), // Full address if known
  zipcode: text("zipcode"),
  neighborhood: text("neighborhood"),
  city: text("city"),
  state: text("state"),
  country: text("country").default("USA"),
  // Coordinates for mapping
  latitude: real("latitude"),
  longitude: real("longitude"),
  // Metadata
  aliases: text("aliases", { mode: "json" }).$type<string[]>().default([]),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// Spots - skateparks, street spots, pools, etc.
export const spots = sqliteTable("spots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  aliases: text("aliases", { mode: "json" }).$type<string[]>().default([]),
  city: text("city"),
  state: text("state"),
  country: text("country").default("USA"),
  type: text("type", { enum: ["street", "park", "pool", "ditch", "vert", "other"] }),
  status: text("status", { enum: ["active", "demolished", "skatestoped", "unknown"] }).default("unknown"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  // Link to location for address details (street, zipcode, etc.)
  locationId: integer("location_id").references(() => locations.id),
  phone: text("phone"), // Contact info for skateparks
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// Photographers
export const photographers = sqliteTable("photographers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  aliases: text("aliases", { mode: "json" }).$type<string[]>().default([]),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// Brands - skate companies, sponsors
export const brands = sqliteTable("brands", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  aliases: text("aliases", { mode: "json" }).$type<string[]>().default([]),
  category: text("category", {
    enum: ["decks", "trucks", "wheels", "bearings", "shoes", "clothing", "accessories", "shop", "other"]
  }),
  activeYearsStart: integer("active_years_start"),
  activeYearsEnd: integer("active_years_end"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// Events - contests, demos, etc.
export const events = sqliteTable("events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  date: text("date"), // ISO date string or partial (e.g., "1981-01")
  location: text("location"),
  spotId: integer("spot_id").references(() => spots.id),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// Tricks - skateboard tricks
export const tricks = sqliteTable("tricks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(), // e.g., "kickflip", "ollie", "540 McTwist"
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// Trick mentions - links tricks to skaters/spots on specific pages
export const trickMentions = sqliteTable("trick_mentions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  magazineId: integer("magazine_id")
    .notNull()
    .references(() => magazines.id, { onDelete: "cascade" }),
  trickId: integer("trick_id")
    .notNull()
    .references(() => tricks.id, { onDelete: "cascade" }),
  skaterId: integer("skater_id").references(() => skaters.id), // who did the trick (optional)
  spotId: integer("spot_id").references(() => spots.id), // where (optional)
  pageNumber: integer("page_number"),
  notes: text("notes"), // e.g., "first documented", "cover shot"
  confidenceScore: real("confidence_score"), // AI confidence 0-1
  verified: integer("verified", { mode: "boolean" }).default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// Magazine appearances - links entities to magazines
export const magazineAppearances = sqliteTable("magazine_appearances", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  magazineId: integer("magazine_id")
    .notNull()
    .references(() => magazines.id, { onDelete: "cascade" }),
  entityType: text("entity_type", {
    enum: ["skater", "spot", "photographer", "brand", "event", "trick", "location"]
  }).notNull(),
  entityId: integer("entity_id").notNull(),
  pageNumbers: text("page_numbers", { mode: "json" }).$type<number[]>().default([]),
  context: text("context", {
    enum: ["cover", "feature", "interview", "photo", "ad", "contest_results", "mention", "other"]
  }),
  confidenceScore: real("confidence_score"), // AI confidence 0-1
  verified: integer("verified", { mode: "boolean" }).default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// Type exports for use in the app
export type Magazine = typeof magazines.$inferSelect;
export type NewMagazine = typeof magazines.$inferInsert;
export type MagazinePage = typeof magazinePages.$inferSelect;
export type Skater = typeof skaters.$inferSelect;
export type NewSkater = typeof skaters.$inferInsert;
export type Spot = typeof spots.$inferSelect;
export type NewSpot = typeof spots.$inferInsert;
export type Photographer = typeof photographers.$inferSelect;
export type NewPhotographer = typeof photographers.$inferInsert;
export type Brand = typeof brands.$inferSelect;
export type NewBrand = typeof brands.$inferInsert;
export type Event = typeof events.$inferSelect;
export type Trick = typeof tricks.$inferSelect;
export type NewTrick = typeof tricks.$inferInsert;
export type TrickMention = typeof trickMentions.$inferSelect;
export type NewTrickMention = typeof trickMentions.$inferInsert;
export type MagazineAppearance = typeof magazineAppearances.$inferSelect;
export type Location = typeof locations.$inferSelect;
export type NewLocation = typeof locations.$inferInsert;
