/**
 * Migration script to add new tables for Discogs-like features:
 * - users, accounts, sessions, verification_tokens (auth)
 * - media (unified table for magazines + videos)
 * - filmers, editors, music_tracks (video credits)
 * - media_credits (unified credits system)
 * - user_collections, user_ratings (collection features)
 * - contributions (edit history)
 */

import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "data", "skate-mag.db");
const db = new Database(dbPath);

// Enable foreign keys
db.pragma("foreign_keys = ON");

const migrations = [
  // Users table
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    email_verified INTEGER,
    name TEXT,
    image TEXT,
    password_hash TEXT,
    username TEXT UNIQUE,
    display_name TEXT,
    bio TEXT,
    location TEXT,
    role TEXT DEFAULT 'user' CHECK(role IN ('user', 'contributor', 'moderator', 'admin')),
    created_at INTEGER DEFAULT (unixepoch())
  )`,

  // Accounts table (NextAuth)
  `CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    provider TEXT NOT NULL,
    providerAccountId TEXT NOT NULL,
    refresh_token TEXT,
    access_token TEXT,
    expires_at INTEGER,
    token_type TEXT,
    scope TEXT,
    id_token TEXT,
    session_state TEXT
  )`,

  // Sessions table (NextAuth)
  `CREATE TABLE IF NOT EXISTS sessions (
    sessionToken TEXT PRIMARY KEY,
    userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires INTEGER NOT NULL
  )`,

  // Verification tokens table (NextAuth)
  `CREATE TABLE IF NOT EXISTS verification_tokens (
    identifier TEXT NOT NULL,
    token TEXT NOT NULL,
    expires INTEGER NOT NULL
  )`,

  // Media table (unified for magazines + videos)
  `CREATE TABLE IF NOT EXISTS media (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    media_type TEXT NOT NULL CHECK(media_type IN ('magazine', 'vhs', 'dvd', 'bluray', 'digital')),
    title TEXT NOT NULL,
    subtitle TEXT,
    volume INTEGER,
    issue INTEGER,
    year INTEGER NOT NULL,
    month INTEGER,
    cover_image TEXT,
    pdf_path TEXT,
    completeness TEXT NOT NULL DEFAULT 'metadata' CHECK(completeness IN ('full', 'metadata')),
    has_full_scans INTEGER DEFAULT 0,
    page_count INTEGER,
    runtime_minutes INTEGER,
    format_details TEXT,
    description TEXT,
    barcode TEXT,
    catalog_number TEXT,
    submitted_by TEXT REFERENCES users(id),
    verified INTEGER DEFAULT 0,
    verified_by TEXT REFERENCES users(id),
    verified_at INTEGER,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'review', 'published')),
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch())
  )`,

  // Filmers table
  `CREATE TABLE IF NOT EXISTS filmers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    aliases TEXT DEFAULT '[]',
    created_at INTEGER DEFAULT (unixepoch())
  )`,

  // Editors table
  `CREATE TABLE IF NOT EXISTS editors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    aliases TEXT DEFAULT '[]',
    created_at INTEGER DEFAULT (unixepoch())
  )`,

  // Music tracks table
  `CREATE TABLE IF NOT EXISTS music_tracks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    album TEXT,
    year INTEGER,
    created_at INTEGER DEFAULT (unixepoch())
  )`,

  // Media credits table (unified credits for both magazines and videos)
  `CREATE TABLE IF NOT EXISTS media_credits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    media_id INTEGER NOT NULL REFERENCES media(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL CHECK(entity_type IN ('skater', 'spot', 'photographer', 'brand', 'event', 'trick', 'location', 'filmer', 'editor', 'music')),
    entity_id INTEGER NOT NULL,
    role TEXT,
    context TEXT,
    page_numbers TEXT DEFAULT '[]',
    timestamp_start INTEGER,
    timestamp_end INTEGER,
    notes TEXT,
    confidence_score REAL,
    verified INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (unixepoch())
  )`,

  // User collections table
  `CREATE TABLE IF NOT EXISTS user_collections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    media_id INTEGER NOT NULL REFERENCES media(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK(status IN ('have', 'want', 'had')),
    condition TEXT CHECK(condition IN ('mint', 'near_mint', 'vg_plus', 'vg', 'good', 'fair', 'poor')),
    condition_notes TEXT,
    acquisition_date INTEGER,
    notes TEXT,
    added_at INTEGER DEFAULT (unixepoch()),
    UNIQUE(user_id, media_id)
  )`,

  // User ratings table
  `CREATE TABLE IF NOT EXISTS user_ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    media_id INTEGER NOT NULL REFERENCES media(id) ON DELETE CASCADE,
    rating INTEGER CHECK(rating >= 1 AND rating <= 5),
    review TEXT,
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch()),
    UNIQUE(user_id, media_id)
  )`,

  // Contributions table (edit history)
  `CREATE TABLE IF NOT EXISTS contributions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id),
    media_id INTEGER NOT NULL REFERENCES media(id) ON DELETE CASCADE,
    field_changed TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    created_at INTEGER DEFAULT (unixepoch())
  )`,

  // Create indexes for better query performance
  `CREATE INDEX IF NOT EXISTS idx_media_type ON media(media_type)`,
  `CREATE INDEX IF NOT EXISTS idx_media_year ON media(year)`,
  `CREATE INDEX IF NOT EXISTS idx_media_completeness ON media(completeness)`,
  `CREATE INDEX IF NOT EXISTS idx_media_credits_media_id ON media_credits(media_id)`,
  `CREATE INDEX IF NOT EXISTS idx_media_credits_entity ON media_credits(entity_type, entity_id)`,
  `CREATE INDEX IF NOT EXISTS idx_user_collections_user ON user_collections(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_user_collections_media ON user_collections(media_id)`,
  `CREATE INDEX IF NOT EXISTS idx_user_ratings_media ON user_ratings(media_id)`,
  `CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(userId)`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(userId)`,
];

console.log("Running migrations...\n");

for (const sql of migrations) {
  const tableName = sql.match(/(?:CREATE TABLE|CREATE INDEX).*?(?:IF NOT EXISTS\s+)?(\w+)/i)?.[1];
  try {
    db.exec(sql);
    console.log(`✓ Created: ${tableName}`);
  } catch (error) {
    if (error instanceof Error && error.message.includes("already exists")) {
      console.log(`○ Exists: ${tableName}`);
    } else {
      console.error(`✗ Error creating ${tableName}:`, error);
    }
  }
}

console.log("\n✓ Migration complete!");

// Show table counts
const tables = [
  "users", "accounts", "sessions", "verification_tokens",
  "media", "filmers", "editors", "music_tracks",
  "media_credits", "user_collections", "user_ratings", "contributions"
];

console.log("\nNew table row counts:");
for (const table of tables) {
  try {
    const count = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get() as { count: number };
    console.log(`  ${table}: ${count.count} rows`);
  } catch {
    console.log(`  ${table}: (table not found)`);
  }
}

db.close();
