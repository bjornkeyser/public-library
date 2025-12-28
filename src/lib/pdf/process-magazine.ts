/**
 * CLI script to process a magazine PDF
 * Usage: npx tsx src/lib/pdf/process-magazine.ts <magazine-id>
 */

import { processPdf } from "./process";
import { db, magazines, magazinePages } from "../db";
import { eq } from "drizzle-orm";

async function main() {
  const magazineId = parseInt(process.argv[2], 10);

  if (isNaN(magazineId)) {
    console.error("Usage: npx tsx src/lib/pdf/process-magazine.ts <magazine-id>");
    console.error("Example: npx tsx src/lib/pdf/process-magazine.ts 1");
    process.exit(1);
  }

  // Get magazine from database
  const magazine = db
    .select()
    .from(magazines)
    .where(eq(magazines.id, magazineId))
    .get();

  if (!magazine) {
    console.error(`Magazine with ID ${magazineId} not found`);
    process.exit(1);
  }

  if (!magazine.pdfPath) {
    console.error(`Magazine ${magazineId} has no PDF path`);
    process.exit(1);
  }

  console.log(`\nProcessing: ${magazine.title} Vol.${magazine.volume} #${magazine.issue}`);
  console.log(`PDF: ${magazine.pdfPath}\n`);

  // Update status to processing
  db.update(magazines)
    .set({ status: "processing" })
    .where(eq(magazines.id, magazineId))
    .run();

  try {
    // Process the PDF
    const result = await processPdf(magazine.pdfPath, magazineId, {
      onProgress: (page, total, status) => {
        process.stdout.write(`\r  Page ${page}/${total}: ${status}...`);
      },
    });

    console.log(`\n\nProcessed ${result.totalPages} pages`);

    // Clear existing pages for this magazine
    db.delete(magazinePages)
      .where(eq(magazinePages.magazineId, magazineId))
      .run();

    // Insert pages into database
    for (const page of result.pages) {
      db.insert(magazinePages)
        .values({
          magazineId,
          pageNumber: page.pageNumber,
          imagePath: page.imagePath,
          textContent: page.text,
        })
        .run();
    }

    // Update magazine status and cover image
    db.update(magazines)
      .set({
        status: "review",
        coverImage: result.pages[0]?.imagePath || null,
      })
      .where(eq(magazines.id, magazineId))
      .run();

    console.log("\nPages saved to database");
    console.log(`Cover image: ${result.pages[0]?.imagePath}`);

    // Print sample of extracted text
    console.log("\n--- Sample extracted text (page 1) ---");
    console.log(result.pages[0]?.text.slice(0, 500) + "...");

    console.log("\n--- Sample extracted text (page 3 - TOC) ---");
    console.log(result.pages[2]?.text.slice(0, 500) + "...");

  } catch (error) {
    console.error("\nError processing PDF:", error);

    // Update status back to pending
    db.update(magazines)
      .set({ status: "pending" })
      .where(eq(magazines.id, magazineId))
      .run();

    process.exit(1);
  }
}

main();
