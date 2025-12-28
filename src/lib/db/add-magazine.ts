/**
 * CLI script to add a new magazine to the database
 * Usage: npx tsx src/lib/db/add-magazine.ts <pdf-path> <title> <year> [volume] [issue] [month]
 *
 * Example: npx tsx src/lib/db/add-magazine.ts /magazines/TW1983_05.pdf "Transworld" 1983 1 5 5
 */

import { db, magazines } from "./index";

function main() {
  const args = process.argv.slice(2);

  if (args.length < 3) {
    console.log("Usage: npx tsx src/lib/db/add-magazine.ts <pdf-path> <title> <year> [volume] [issue] [month]");
    console.log("");
    console.log("Examples:");
    console.log('  npx tsx src/lib/db/add-magazine.ts /magazines/TH1982_03.pdf "Thrasher" 1982 2 3 3');
    console.log('  npx tsx src/lib/db/add-magazine.ts /magazines/TW1990_01.pdf "Transworld" 1990 8 1 1');
    console.log("");
    console.log("Arguments:");
    console.log("  pdf-path  Path to PDF (relative to public folder, e.g., /magazines/TH1982_03.pdf)");
    console.log("  title     Magazine name (e.g., Thrasher, Transworld)");
    console.log("  year      Publication year");
    console.log("  volume    Volume number (optional)");
    console.log("  issue     Issue number (optional)");
    console.log("  month     Month 1-12 (optional)");
    process.exit(1);
  }

  const [pdfPath, title, yearStr, volumeStr, issueStr, monthStr] = args;
  const year = parseInt(yearStr, 10);
  const volume = volumeStr ? parseInt(volumeStr, 10) : null;
  const issue = issueStr ? parseInt(issueStr, 10) : null;
  const month = monthStr ? parseInt(monthStr, 10) : null;

  if (isNaN(year)) {
    console.error("Error: year must be a number");
    process.exit(1);
  }

  const result = db
    .insert(magazines)
    .values({
      pdfPath,
      title,
      year,
      volume,
      issue,
      month,
      status: "pending",
    })
    .returning()
    .all();

  const mag = result[0];
  console.log(`\nAdded magazine with ID: ${mag.id}`);
  console.log(`  Title: ${mag.title}`);
  console.log(`  Year: ${mag.year}`);
  console.log(`  PDF: ${mag.pdfPath}`);
  console.log(`\nTo process this magazine, run:`);
  console.log(`  npm run pdf:process ${mag.id}`);
}

main();
