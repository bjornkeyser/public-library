/**
 * CLI script to run AI extraction on a magazine
 * Usage: npx tsx src/lib/ai/extract-magazine.ts <magazine-id> [--vision]
 *
 * Requires ANTHROPIC_API_KEY environment variable (can be in .env.local)
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { extractEntitiesPageByPage, extractEntitiesWithVision, saveExtractionResults } from "./extract";
import { db, magazines, magazineAppearances, trickMentions } from "../db";
import { eq } from "drizzle-orm";

async function main() {
  // Parse arguments
  const args = process.argv.slice(2);
  const useVision = args.includes("--vision");
  const numericArgs = args.filter((a) => !a.startsWith("--")).map((a) => parseInt(a, 10));

  const magazineId = numericArgs[0];
  const maxPages = numericArgs[1] || undefined;

  if (isNaN(magazineId)) {
    console.error("Usage: npx tsx src/lib/ai/extract-magazine.ts <magazine-id> [max-pages] [--vision]");
    console.error("Example: npx tsx src/lib/ai/extract-magazine.ts 1");
    console.error("Example: npx tsx src/lib/ai/extract-magazine.ts 1 5  # test with 5 pages");
    console.error("Example: npx tsx src/lib/ai/extract-magazine.ts 1 --vision  # use vision instead of OCR");
    console.error("\nMake sure ANTHROPIC_API_KEY is set in your environment");
    process.exit(1);
  }

  // Check API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("Error: ANTHROPIC_API_KEY environment variable is not set");
    console.error("Set it with: export ANTHROPIC_API_KEY=your-key-here");
    process.exit(1);
  }

  // Get magazine
  const magazine = db
    .select()
    .from(magazines)
    .where(eq(magazines.id, magazineId))
    .get();

  if (!magazine) {
    console.error(`Magazine with ID ${magazineId} not found`);
    process.exit(1);
  }

  console.log(`\n=== AI Entity Extraction ===`);
  console.log(`Magazine: ${magazine.title} Vol.${magazine.volume} #${magazine.issue} (${magazine.year})`);
  console.log(`Mode: ${useVision ? "VISION (image-based)" : "OCR (text-based)"}`);
  console.log(`Status: ${magazine.status}\n`);

  // Clear existing AI-extracted data for this magazine
  console.log("Clearing previous extraction results...");
  db.delete(magazineAppearances)
    .where(eq(magazineAppearances.magazineId, magazineId))
    .run();
  db.delete(trickMentions)
    .where(eq(trickMentions.magazineId, magazineId))
    .run();

  try {
    // Extract entities using chosen method
    let results;
    if (useVision) {
      console.log("Extracting entities with Claude Haiku VISION (page images)...\n");
      results = await extractEntitiesWithVision(magazineId, { maxPages });
    } else {
      console.log("Extracting entities with Claude Haiku (OCR text)...\n");
      results = await extractEntitiesPageByPage(magazineId, { maxPages });
    }

    // Show summary
    console.log("\n=== Extraction Results ===");
    console.log(`Skaters: ${results.skaters.length}`);
    console.log(`Spots: ${results.spots.length}`);
    console.log(`Photographers: ${results.photographers.length}`);
    console.log(`Brands: ${results.brands.length}`);
    console.log(`Tricks: ${results.tricks.length}`);
    console.log(`Events: ${results.events.length}`);

    // Save to database
    await saveExtractionResults(magazineId, results);

    console.log(`\nDone! Magazine status updated to 'review'`);
    console.log(`View extracted entities at: http://localhost:3001/magazines/${magazineId}`);

  } catch (error) {
    console.error("\nError during extraction:", error);
    process.exit(1);
  }
}

main();
