import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

// Enums as const objects
export const mediaTypes = ["magazine", "vhs", "dvd", "bluray", "digital"] as const;
export const completenessLevels = ["full", "metadata"] as const;
export const conditions = ["mint", "near_mint", "vg_plus", "vg", "good", "fair", "poor"] as const;
export const userRoles = ["user", "contributor", "moderator", "admin"] as const;
export const collectionStatuses = ["have", "want", "had"] as const;

// === Users ===
export const users = sqliteTable("users", {
  id: text("id").primaryKey(), // UUID
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "timestamp" }),
  name: text("name"), // Required by NextAuth
  image: text("image"), // Required by NextAuth
  passwordHash: text("password_hash"),
  username: text("username").unique(),
  displayName: text("display_name"),
  bio: text("bio"),
  location: text("location"),
  role: text("role", { enum: userRoles }).default("user"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// === Auth (NextAuth) ===
export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("providerAccountId").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
});

export const sessions = sqliteTable("sessions", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: integer("expires", { mode: "timestamp" }).notNull(),
});

export const verificationTokens = sqliteTable("verification_tokens", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: integer("expires", { mode: "timestamp" }).notNull(),
});

// Magazine - the core entity representing a single issue (legacy, will migrate to media)
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

// === Media (unified table for magazines + videos) ===
export const media = sqliteTable("media", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  mediaType: text("media_type", { enum: mediaTypes }).notNull(),
  title: text("title").notNull(), // e.g., "Thrasher", "411VM", "The End"
  subtitle: text("subtitle"), // Issue-specific title or video subtitle
  volume: integer("volume"),
  issue: integer("issue"),
  year: integer("year").notNull(),
  month: integer("month"),
  coverImage: text("cover_image"),
  pdfPath: text("pdf_path"), // for magazines with full scans

  // Completeness tracking
  completeness: text("completeness", { enum: completenessLevels }).notNull().default("metadata"),
  hasFullScans: integer("has_full_scans", { mode: "boolean" }).default(false),
  pageCount: integer("page_count"),

  // Video-specific
  runtimeMinutes: integer("runtime_minutes"),
  formatDetails: text("format_details", { mode: "json" }).$type<{
    resolution?: string;
    aspectRatio?: string;
    region?: string;
  }>(),

  // Metadata
  description: text("description"),
  barcode: text("barcode"), // UPC/EAN
  catalogNumber: text("catalog_number"),

  // Contribution tracking
  submittedBy: text("submitted_by").references(() => users.id),
  verified: integer("verified", { mode: "boolean" }).default(false),
  verifiedBy: text("verified_by").references(() => users.id),
  verifiedAt: integer("verified_at", { mode: "timestamp" }),

  status: text("status", { enum: ["pending", "processing", "review", "published"] })
    .notNull()
    .default("pending"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// === Video Credits (filmers, editors, music) ===
export const filmers = sqliteTable("filmers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  aliases: text("aliases", { mode: "json" }).$type<string[]>().default([]),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const editors = sqliteTable("editors", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  aliases: text("aliases", { mode: "json" }).$type<string[]>().default([]),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const musicTracks = sqliteTable("music_tracks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  artist: text("artist").notNull(),
  album: text("album"),
  year: integer("year"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// === Media Credits (unified credits for both magazines and videos) ===
export const mediaCredits = sqliteTable("media_credits", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  mediaId: integer("media_id")
    .notNull()
    .references(() => media.id, { onDelete: "cascade" }),
  entityType: text("entity_type", {
    enum: ["skater", "spot", "photographer", "brand", "event", "trick", "location", "filmer", "editor", "music"]
  }).notNull(),
  entityId: integer("entity_id").notNull(),
  role: text("role"), // 'featured', 'cameo', 'director', 'additional_filming', etc.
  context: text("context"), // 'cover', 'photo', 'part', 'intro', 'credits', etc.
  pageNumbers: text("page_numbers", { mode: "json" }).$type<number[]>().default([]),
  timestampStart: integer("timestamp_start"), // seconds, for videos
  timestampEnd: integer("timestamp_end"),
  notes: text("notes"),
  confidenceScore: real("confidence_score"),
  verified: integer("verified", { mode: "boolean" }).default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// === User Collections & Wishlists ===
export const userCollections = sqliteTable("user_collections", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  mediaId: integer("media_id").notNull().references(() => media.id, { onDelete: "cascade" }),
  status: text("status", { enum: collectionStatuses }).notNull(),
  condition: text("condition", { enum: conditions }),
  conditionNotes: text("condition_notes"),
  acquisitionDate: integer("acquisition_date", { mode: "timestamp" }),
  notes: text("notes"),
  addedAt: integer("added_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// === Ratings & Reviews ===
export const userRatings = sqliteTable("user_ratings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  mediaId: integer("media_id").notNull().references(() => media.id, { onDelete: "cascade" }),
  rating: integer("rating"), // 1-5
  review: text("review"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// === Contributions (Edit History) ===
export const contributions = sqliteTable("contributions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().references(() => users.id),
  mediaId: integer("media_id").notNull().references(() => media.id, { onDelete: "cascade" }),
  fieldChanged: text("field_changed").notNull(),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// === Relations ===
export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  collections: many(userCollections),
  ratings: many(userRatings),
  contributions: many(contributions),
}));

export const mediaRelations = relations(media, ({ one, many }) => ({
  submittedByUser: one(users, {
    fields: [media.submittedBy],
    references: [users.id],
  }),
  verifiedByUser: one(users, {
    fields: [media.verifiedBy],
    references: [users.id],
  }),
  credits: many(mediaCredits),
  collections: many(userCollections),
  ratings: many(userRatings),
}));

export const userCollectionsRelations = relations(userCollections, ({ one }) => ({
  user: one(users, {
    fields: [userCollections.userId],
    references: [users.id],
  }),
  media: one(media, {
    fields: [userCollections.mediaId],
    references: [media.id],
  }),
}));

export const userRatingsRelations = relations(userRatings, ({ one }) => ({
  user: one(users, {
    fields: [userRatings.userId],
    references: [users.id],
  }),
  media: one(media, {
    fields: [userRatings.mediaId],
    references: [media.id],
  }),
}));

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

// New type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Media = typeof media.$inferSelect;
export type NewMedia = typeof media.$inferInsert;
export type MediaCredit = typeof mediaCredits.$inferSelect;
export type NewMediaCredit = typeof mediaCredits.$inferInsert;
export type UserCollection = typeof userCollections.$inferSelect;
export type NewUserCollection = typeof userCollections.$inferInsert;
export type UserRating = typeof userRatings.$inferSelect;
export type NewUserRating = typeof userRatings.$inferInsert;
export type Filmer = typeof filmers.$inferSelect;
export type NewFilmer = typeof filmers.$inferInsert;
export type Editor = typeof editors.$inferSelect;
export type NewEditor = typeof editors.$inferInsert;
export type MusicTrack = typeof musicTracks.$inferSelect;
export type NewMusicTrack = typeof musicTracks.$inferInsert;
