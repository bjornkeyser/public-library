/**
 * Migration script to copy existing magazines data into the new media table.
 * This preserves the original magazines table for backwards compatibility
 * while populating the new unified media table.
 */

import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "data", "skate-mag.db");
const db = new Database(dbPath);

// Enable foreign keys
db.pragma("foreign_keys = ON");

console.log("Migrating magazines to media table...\n");

// Get all magazines
const magazines = db.prepare(`
  SELECT id, title, volume, issue, year, month, cover_image, pdf_path, status, created_at, updated_at
  FROM magazines
`).all() as Array<{
  id: number;
  title: string;
  volume: number | null;
  issue: number | null;
  year: number;
  month: number | null;
  cover_image: string | null;
  pdf_path: string | null;
  status: string;
  created_at: number | null;
  updated_at: number | null;
}>;

console.log(`Found ${magazines.length} magazines to migrate.\n`);

// Get page counts for each magazine
const getPageCount = db.prepare(`
  SELECT COUNT(*) as count FROM magazine_pages WHERE magazine_id = ?
`);

// Insert into media table
const insertMedia = db.prepare(`
  INSERT INTO media (
    id, media_type, title, volume, issue, year, month,
    cover_image, pdf_path, completeness, has_full_scans, page_count,
    status, created_at, updated_at, verified
  ) VALUES (
    ?, 'magazine', ?, ?, ?, ?, ?,
    ?, ?, 'full', 1, ?,
    ?, ?, ?, 1
  )
`);

// Start transaction
const transaction = db.transaction(() => {
  for (const mag of magazines) {
    const pageCount = (getPageCount.get(mag.id) as { count: number }).count;

    try {
      insertMedia.run(
        mag.id,
        mag.title,
        mag.volume,
        mag.issue,
        mag.year,
        mag.month,
        mag.cover_image,
        mag.pdf_path,
        pageCount > 0 ? pageCount : null,
        mag.status || 'published',
        mag.created_at,
        mag.updated_at
      );
      console.log(`✓ Migrated: ${mag.title} ${mag.issue ? `#${mag.issue}` : ''} (${mag.year}) - ${pageCount} pages`);
    } catch (error) {
      if (error instanceof Error && error.message.includes("UNIQUE constraint")) {
        console.log(`○ Already exists: ${mag.title} ${mag.issue ? `#${mag.issue}` : ''} (${mag.year})`);
      } else {
        console.error(`✗ Error migrating ${mag.title}:`, error);
      }
    }
  }
});

try {
  transaction();
  console.log("\n✓ Migration complete!");

  // Show counts
  const mediaCount = (db.prepare("SELECT COUNT(*) as count FROM media").get() as { count: number }).count;
  const magazineCount = (db.prepare("SELECT COUNT(*) as count FROM magazines").get() as { count: number }).count;

  console.log(`\nVerification:`);
  console.log(`  magazines table: ${magazineCount} rows`);
  console.log(`  media table: ${mediaCount} rows`);
} catch (error) {
  console.error("Migration failed:", error);
}

db.close();
