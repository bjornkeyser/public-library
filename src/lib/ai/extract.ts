/**
 * AI-powered entity extraction from magazine OCR text
 * Uses Claude to identify skaters, spots, photographers, brands, tricks, and events
 */

import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";
import {
  db,
  magazines,
  magazinePages,
  skaters,
  spots,
  photographers,
  brands,
  tricks,
  events,
  locations,
  magazineAppearances,
  trickMentions,
} from "../db";
import { eq } from "drizzle-orm";

// Lazy-initialize client to ensure env vars are loaded first
let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic();
  }
  return _client;
}

// Types for extraction results
interface ExtractedSkater {
  name: string;
  pageNumbers: number[];
  context: "cover" | "feature" | "interview" | "photo" | "ad" | "contest_results" | "mention" | "other";
}

interface ExtractedSpot {
  name: string;
  city?: string;
  state?: string;
  type?: "street" | "park" | "pool" | "ditch" | "vert" | "other";
  pageNumbers: number[];
  // Address details (for skateparks with specific addresses)
  address?: string;
  streetNumber?: string;
  streetName?: string;
  zipcode?: string;
  phone?: string;
}

interface ExtractedPhotographer {
  name: string;
  pageNumbers: number[];
}

interface ExtractedBrand {
  name: string;
  category?: "decks" | "trucks" | "wheels" | "bearings" | "shoes" | "clothing" | "accessories" | "shop" | "other";
  pageNumbers: number[];
  context: "ad" | "feature" | "mention" | "other";
}

interface ExtractedTrick {
  name: string;
  pageNumbers: number[];
  performedBy?: string; // skater name if known
  location?: string; // spot name if known
}

interface ExtractedEvent {
  name: string;
  date?: string;
  location?: string;
  pageNumbers: number[];
}

interface ExtractedLocation {
  name: string;
  type?: "city" | "state" | "country" | "region" | "neighborhood" | "street" | "address" | "zipcode" | "other";
  streetName?: string;
  streetNumber?: string;
  address?: string;
  zipcode?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  country?: string;
  pageNumbers: number[];
}

interface ExtractionResult {
  skaters: ExtractedSkater[];
  spots: ExtractedSpot[];
  photographers: ExtractedPhotographer[];
  brands: ExtractedBrand[];
  tricks: ExtractedTrick[];
  events: ExtractedEvent[];
  locations: ExtractedLocation[];
}

// Prompt for single-page extraction (more thorough)
const PAGE_EXTRACTION_PROMPT = `You are extracting entities from a single page of a skateboard magazine.

IMPORTANT: Extract EVERY name and entity you can find, even if mentioned only once. Be thorough.

Look for:
- SKATERS: Any person's name mentioned (first + last name when possible)
- TRICKS: Skateboard maneuvers (ollie, kickflip, grind, invert, air, slide, etc.)
- SPOTS: Specific skateable locations (parks, pools, plazas, etc.)
- PHOTOGRAPHERS: Usually in photo credits ("Photo:", "Ph:", photographer bylines)
- BRANDS: Skateboard companies, shoe brands, clothing, shops (especially in ads)
- EVENTS: Contests, demos, tours, competitions
- LOCATIONS: Any geographic mentions - cities, states, countries, neighborhoods, streets, addresses, zipcodes. Even partial mentions like "downtown" or "the east coast"

Magazine: {{TITLE}} ({{YEAR}})
Page: {{PAGE_NUMBER}}

OCR TEXT:
{{TEXT}}

Return JSON (ONLY JSON, no other text):
{
  "skaters": [{"name": "Full Name", "context": "feature|interview|photo|ad|contest_results|mention|cover|other"}],
  "spots": [{"name": "Spot Name", "city": "City or null", "state": "State or null", "type": "street|park|pool|ditch|vert|other", "address": "Full street address or null", "streetNumber": "Street number or null", "streetName": "Street name or null", "zipcode": "Zipcode or null", "phone": "Phone number or null"}],
  "photographers": [{"name": "Full Name"}],
  "brands": [{"name": "Brand Name", "category": "decks|trucks|wheels|bearings|shoes|clothing|accessories|shop|other", "context": "ad|feature|mention|other"}],
  "tricks": [{"name": "trick name", "performedBy": "Skater Name or null", "location": "Spot Name or null"}],
  "events": [{"name": "Event Name", "date": "YYYY-MM or null", "location": "City, State or null"}],
  "locations": [{"name": "Location as mentioned", "type": "city|state|country|region|neighborhood|street|address|zipcode|other", "city": "City or null", "state": "State or null", "country": "Country or null", "neighborhood": "Neighborhood or null", "streetName": "Street name or null", "address": "Full address or null", "zipcode": "Zipcode or null"}]
}`;

// Vision + OCR hybrid extraction prompt (uses both image and OCR text)
const VISION_EXTRACTION_PROMPT = `You are extracting entities from a page of a skateboard magazine.

You have TWO sources of information:
1. The PAGE IMAGE - look at this carefully for visual context, stylized fonts, photo credits, ads
2. The OCR TEXT below - use this as a hint for hard-to-read text (may contain errors)

IMPORTANT: Extract EVERY name and entity you can find. Cross-reference the image with the OCR text.

Look for:
- SKATERS: Any person's name mentioned (first + last name when possible). Check captions, headlines, body text, photo credits.
- TRICKS: Skateboard maneuvers (ollie, kickflip, grind, invert, air, slide, etc.)
- SPOTS: Specific skateable locations (parks, pools, plazas, etc.)
- PHOTOGRAPHERS: Usually in photo credits ("Photo:", "Ph:", photographer bylines)
- BRANDS: Skateboard companies, shoe brands, clothing, shops (especially in ads)
- EVENTS: Contests, demos, tours, competitions
- LOCATIONS: Any geographic mentions - cities, states, countries, neighborhoods, streets, addresses, zipcodes

Magazine: {{TITLE}} ({{YEAR}})
Page: {{PAGE_NUMBER}}

OCR TEXT (may contain errors):
{{OCR_TEXT}}

Return JSON (ONLY JSON, no other text):
{
  "skaters": [{"name": "Full Name", "context": "feature|interview|photo|ad|contest_results|mention|cover|other"}],
  "spots": [{"name": "Spot Name", "city": "City or null", "state": "State or null", "type": "street|park|pool|ditch|vert|other", "address": "Full street address or null", "streetNumber": "Street number or null", "streetName": "Street name or null", "zipcode": "Zipcode or null", "phone": "Phone number or null"}],
  "photographers": [{"name": "Full Name"}],
  "brands": [{"name": "Brand Name", "category": "decks|trucks|wheels|bearings|shoes|clothing|accessories|shop|other", "context": "ad|feature|mention|other"}],
  "tricks": [{"name": "trick name", "performedBy": "Skater Name or null", "location": "Spot Name or null"}],
  "events": [{"name": "Event Name", "date": "YYYY-MM or null", "location": "City, State or null"}],
  "locations": [{"name": "Location as mentioned", "type": "city|state|country|region|neighborhood|street|address|zipcode|other", "city": "City or null", "state": "State or null", "country": "Country or null", "neighborhood": "Neighborhood or null", "streetName": "Street name or null", "address": "Full address or null", "zipcode": "Zipcode or null"}]
}`;

// Legacy prompt for whole-magazine extraction (kept for reference)
const EXTRACTION_PROMPT = `You are an expert at analyzing vintage skateboard magazine content. Extract structured information from the following OCR text from a skateboard magazine.

IMPORTANT GUIDELINES:
1. This is OCR text from scanned magazines, so expect some errors and typos
2. Focus on extracting real skateboard-related entities, not generic words
3. For skater names, look for both first and last names when possible
4. Photographers are usually credited with "Photo:" or "Ph:" prefixes
5. Spots are specific skateable locations (not cities or countries)
6. Brands include skateboard companies, shoe companies, clothing brands, and local skate shops
7. Tricks are specific skateboard maneuvers (ollie, kickflip, frontside grind, etc.)
8. Events are contests, demos, or tours mentioned in the magazine

Return a JSON object with this exact structure:
{
  "skaters": [
    {"name": "Full Name", "pageNumbers": [1, 2], "context": "feature|interview|photo|ad|contest_results|mention|cover|other"}
  ],
  "spots": [
    {"name": "Spot Name", "city": "City", "state": "State", "type": "street|park|pool|ditch|vert|other", "pageNumbers": [1]}
  ],
  "photographers": [
    {"name": "Full Name", "pageNumbers": [1, 2]}
  ],
  "brands": [
    {"name": "Brand Name", "category": "decks|trucks|wheels|bearings|shoes|clothing|accessories|shop|other", "pageNumbers": [1], "context": "ad|feature|mention|other"}
  ],
  "tricks": [
    {"name": "trick name", "pageNumbers": [1], "performedBy": "Skater Name or null", "location": "Spot Name or null"}
  ],
  "events": [
    {"name": "Event Name", "date": "YYYY-MM or YYYY", "location": "City, State", "pageNumbers": [1]}
  ]
}

MAGAZINE INFO:
Title: {{TITLE}}
Year: {{YEAR}}
Volume: {{VOLUME}}
Issue: {{ISSUE}}

OCR TEXT BY PAGE:
{{PAGES}}

Return ONLY the JSON object, no other text.`;

/**
 * Extract entities from a magazine's OCR text using Claude
 */
export async function extractEntities(
  magazineId: number,
  options: { maxPages?: number } = {}
): Promise<ExtractionResult> {
  const { maxPages } = options;
  // Get magazine info
  const magazine = db
    .select()
    .from(magazines)
    .where(eq(magazines.id, magazineId))
    .get();

  if (!magazine) {
    throw new Error(`Magazine ${magazineId} not found`);
  }

  // Get pages (optionally limited for testing)
  let pages = db
    .select()
    .from(magazinePages)
    .where(eq(magazinePages.magazineId, magazineId))
    .all();

  if (maxPages && maxPages > 0) {
    pages = pages.slice(0, maxPages);
    console.log(`Limited to ${maxPages} page(s) for testing`);
  }

  if (pages.length === 0) {
    throw new Error(`No pages found for magazine ${magazineId}`);
  }

  // Build page text
  const pagesText = pages
    .map((p) => `--- PAGE ${p.pageNumber} ---\n${p.textContent || "(no text)"}`)
    .join("\n\n");

  // Build prompt
  const prompt = EXTRACTION_PROMPT
    .replace("{{TITLE}}", magazine.title)
    .replace("{{YEAR}}", String(magazine.year))
    .replace("{{VOLUME}}", String(magazine.volume || "N/A"))
    .replace("{{ISSUE}}", String(magazine.issue || "N/A"))
    .replace("{{PAGES}}", pagesText);

  console.log(`Sending ${pagesText.length} characters to Claude...`);

  // Call Claude
  const response = await getClient().messages.create({
    model: "claude-3-5-haiku-20241022",
    max_tokens: 8192,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  // Extract JSON from response
  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from Claude");
  }

  // Parse JSON (handle potential markdown code blocks)
  let jsonText = content.text.trim();
  if (jsonText.startsWith("```json")) {
    jsonText = jsonText.slice(7);
  }
  if (jsonText.startsWith("```")) {
    jsonText = jsonText.slice(3);
  }
  if (jsonText.endsWith("```")) {
    jsonText = jsonText.slice(0, -3);
  }

  const result: ExtractionResult = JSON.parse(jsonText.trim());
  return result;
}

// Types for single-page extraction (without pageNumbers array)
interface PageExtractedSkater {
  name: string;
  context: string;
}
interface PageExtractedSpot {
  name: string;
  city?: string | null;
  state?: string | null;
  type?: string;
  // Address details
  address?: string | null;
  streetNumber?: string | null;
  streetName?: string | null;
  zipcode?: string | null;
  phone?: string | null;
}
interface PageExtractedPhotographer {
  name: string;
}
interface PageExtractedBrand {
  name: string;
  category?: string;
  context: string;
}
interface PageExtractedTrick {
  name: string;
  performedBy?: string | null;
  location?: string | null;
}
interface PageExtractedEvent {
  name: string;
  date?: string | null;
  location?: string | null;
}
interface PageExtractedLocation {
  name: string;
  type?: string;
  streetName?: string | null;
  streetNumber?: string | null;
  address?: string | null;
  zipcode?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
}
interface PageExtractionResult {
  skaters: PageExtractedSkater[];
  spots: PageExtractedSpot[];
  photographers: PageExtractedPhotographer[];
  brands: PageExtractedBrand[];
  tricks: PageExtractedTrick[];
  events: PageExtractedEvent[];
  locations: PageExtractedLocation[];
}

/**
 * Extract entities from a single page
 */
async function extractFromPage(
  magazineTitle: string,
  year: number,
  pageNumber: number,
  textContent: string
): Promise<PageExtractionResult> {
  const prompt = PAGE_EXTRACTION_PROMPT
    .replace("{{TITLE}}", magazineTitle)
    .replace("{{YEAR}}", String(year))
    .replace("{{PAGE_NUMBER}}", String(pageNumber))
    .replace("{{TEXT}}", textContent || "(no text content)");

  const response = await getClient().messages.create({
    model: "claude-3-5-haiku-20241022",
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from Claude");
  }

  // Parse JSON
  let jsonText = content.text.trim();
  if (jsonText.startsWith("```json")) jsonText = jsonText.slice(7);
  if (jsonText.startsWith("```")) jsonText = jsonText.slice(3);
  if (jsonText.endsWith("```")) jsonText = jsonText.slice(0, -3);

  try {
    return JSON.parse(jsonText.trim());
  } catch (e) {
    console.error(`Failed to parse JSON for page ${pageNumber}:`, jsonText);
    return { skaters: [], spots: [], photographers: [], brands: [], tricks: [], events: [], locations: [] };
  }
}

/**
 * Extract entities from a single page using vision + OCR hybrid
 */
async function extractFromPageWithVision(
  magazineTitle: string,
  year: number,
  pageNumber: number,
  imagePath: string,
  ocrText: string
): Promise<PageExtractionResult> {
  // Read image and convert to base64
  const absolutePath = path.join(process.cwd(), "public", imagePath);

  if (!fs.existsSync(absolutePath)) {
    console.warn(`Image not found: ${absolutePath}`);
    return { skaters: [], spots: [], photographers: [], brands: [], tricks: [], events: [], locations: [] };
  }

  const imageData = fs.readFileSync(absolutePath);
  const base64Image = imageData.toString("base64");

  // Determine media type from extension
  const ext = path.extname(imagePath).toLowerCase();
  const mediaType = ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "image/png";

  const prompt = VISION_EXTRACTION_PROMPT
    .replace("{{TITLE}}", magazineTitle)
    .replace("{{YEAR}}", String(year))
    .replace("{{PAGE_NUMBER}}", String(pageNumber))
    .replace("{{OCR_TEXT}}", ocrText || "(no OCR text available)");

  const response = await getClient().messages.create({
    model: "claude-3-5-haiku-20241022",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType,
              data: base64Image,
            },
          },
          {
            type: "text",
            text: prompt,
          },
        ],
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from Claude");
  }

  // Parse JSON
  let jsonText = content.text.trim();
  if (jsonText.startsWith("```json")) jsonText = jsonText.slice(7);
  if (jsonText.startsWith("```")) jsonText = jsonText.slice(3);
  if (jsonText.endsWith("```")) jsonText = jsonText.slice(0, -3);

  try {
    return JSON.parse(jsonText.trim());
  } catch (e) {
    console.error(`Failed to parse JSON for page ${pageNumber}:`, jsonText);
    return { skaters: [], spots: [], photographers: [], brands: [], tricks: [], events: [], locations: [] };
  }
}

/**
 * Extract entities page-by-page using VISION (sends images to Claude)
 * This is more accurate than OCR but costs more (~$0.003/page for haiku)
 */
export async function extractEntitiesWithVision(
  magazineId: number,
  options: { maxPages?: number; concurrency?: number } = {}
): Promise<ExtractionResult> {
  const { maxPages, concurrency = 2 } = options; // Lower concurrency for vision

  // Get magazine info
  const magazine = db
    .select()
    .from(magazines)
    .where(eq(magazines.id, magazineId))
    .get();

  if (!magazine) {
    throw new Error(`Magazine ${magazineId} not found`);
  }

  // Get pages
  let pages = db
    .select()
    .from(magazinePages)
    .where(eq(magazinePages.magazineId, magazineId))
    .all()
    .sort((a, b) => a.pageNumber - b.pageNumber);

  if (maxPages && maxPages > 0) {
    pages = pages.slice(0, maxPages);
    console.log(`Limited to ${maxPages} page(s) for testing`);
  }

  if (pages.length === 0) {
    throw new Error(`No pages found for magazine ${magazineId}`);
  }

  console.log(`Processing ${pages.length} pages with VISION+OCR hybrid (${concurrency} at a time)...`);

  // Aggregate maps for deduplication
  const skaterMap = new Map<string, ExtractedSkater>();
  const spotMap = new Map<string, ExtractedSpot>();
  const photographerMap = new Map<string, ExtractedPhotographer>();
  const brandMap = new Map<string, ExtractedBrand>();
  const trickMap = new Map<string, ExtractedTrick>();
  const eventMap = new Map<string, ExtractedEvent>();
  const locationMap = new Map<string, ExtractedLocation>();

  // Process pages in batches
  for (let i = 0; i < pages.length; i += concurrency) {
    const batch = pages.slice(i, i + concurrency);
    const batchPromises = batch.map(async (page) => {
      process.stdout.write(`  Page ${page.pageNumber}...`);

      if (!page.imagePath) {
        console.log(` ✗ (no image)`);
        return { pageNumber: page.pageNumber, result: { skaters: [], spots: [], photographers: [], brands: [], tricks: [], events: [], locations: [] } as PageExtractionResult };
      }

      const result = await extractFromPageWithVision(
        magazine.title,
        magazine.year,
        page.pageNumber,
        page.imagePath,
        page.textContent || ""
      );
      const skaterCount = result.skaters?.length || 0;
      const trickCount = result.tricks?.length || 0;
      const photoCount = result.photographers?.length || 0;
      console.log(` ✓ (${skaterCount}s, ${trickCount}t, ${photoCount}p)`);
      return { pageNumber: page.pageNumber, result };
    });

    const batchResults = await Promise.all(batchPromises);

    // Aggregate results (same logic as text-based extraction)
    for (const { pageNumber, result } of batchResults) {
      // Skaters
      for (const s of result.skaters || []) {
        if (!s.name) continue;
        const key = s.name.toLowerCase().trim();
        if (skaterMap.has(key)) {
          const existing = skaterMap.get(key)!;
          if (!existing.pageNumbers.includes(pageNumber)) {
            existing.pageNumbers.push(pageNumber);
          }
        } else {
          skaterMap.set(key, {
            name: s.name,
            pageNumbers: [pageNumber],
            context: (s.context as any) || "mention",
          });
        }
      }

      // Spots
      for (const s of result.spots || []) {
        if (!s.name) continue;
        const key = s.name.toLowerCase().trim();
        if (spotMap.has(key)) {
          const existing = spotMap.get(key)!;
          if (!existing.pageNumbers.includes(pageNumber)) {
            existing.pageNumbers.push(pageNumber);
          }
        } else {
          spotMap.set(key, {
            name: s.name,
            city: s.city || undefined,
            state: s.state || undefined,
            type: (s.type as any) || undefined,
            pageNumbers: [pageNumber],
            address: s.address || undefined,
            streetNumber: s.streetNumber || undefined,
            streetName: s.streetName || undefined,
            zipcode: s.zipcode || undefined,
            phone: s.phone || undefined,
          });
        }
      }

      // Photographers
      for (const p of result.photographers || []) {
        if (!p.name) continue;
        const key = p.name.toLowerCase().trim();
        if (photographerMap.has(key)) {
          const existing = photographerMap.get(key)!;
          if (!existing.pageNumbers.includes(pageNumber)) {
            existing.pageNumbers.push(pageNumber);
          }
        } else {
          photographerMap.set(key, {
            name: p.name,
            pageNumbers: [pageNumber],
          });
        }
      }

      // Brands
      for (const b of result.brands || []) {
        if (!b.name) continue;
        const key = b.name.toLowerCase().trim();
        if (brandMap.has(key)) {
          const existing = brandMap.get(key)!;
          if (!existing.pageNumbers.includes(pageNumber)) {
            existing.pageNumbers.push(pageNumber);
          }
        } else {
          brandMap.set(key, {
            name: b.name,
            category: (b.category as any) || undefined,
            pageNumbers: [pageNumber],
            context: (b.context as any) || "mention",
          });
        }
      }

      // Tricks
      for (const t of result.tricks || []) {
        if (!t.name) continue;
        const key = t.name.toLowerCase().trim();
        if (trickMap.has(key)) {
          const existing = trickMap.get(key)!;
          if (!existing.pageNumbers.includes(pageNumber)) {
            existing.pageNumbers.push(pageNumber);
          }
        } else {
          trickMap.set(key, {
            name: t.name,
            pageNumbers: [pageNumber],
            performedBy: t.performedBy || undefined,
            location: t.location || undefined,
          });
        }
      }

      // Events
      for (const e of result.events || []) {
        if (!e.name) continue;
        const key = e.name.toLowerCase().trim();
        if (eventMap.has(key)) {
          const existing = eventMap.get(key)!;
          if (!existing.pageNumbers.includes(pageNumber)) {
            existing.pageNumbers.push(pageNumber);
          }
        } else {
          eventMap.set(key, {
            name: e.name,
            date: e.date || undefined,
            location: e.location || undefined,
            pageNumbers: [pageNumber],
          });
        }
      }

      // Locations
      for (const l of result.locations || []) {
        if (!l.name) continue;
        const key = l.name.toLowerCase().trim();
        if (locationMap.has(key)) {
          const existing = locationMap.get(key)!;
          if (!existing.pageNumbers.includes(pageNumber)) {
            existing.pageNumbers.push(pageNumber);
          }
        } else {
          locationMap.set(key, {
            name: l.name,
            type: (l.type as any) || undefined,
            streetName: l.streetName || undefined,
            streetNumber: l.streetNumber || undefined,
            address: l.address || undefined,
            zipcode: l.zipcode || undefined,
            neighborhood: l.neighborhood || undefined,
            city: l.city || undefined,
            state: l.state || undefined,
            country: l.country || undefined,
            pageNumbers: [pageNumber],
          });
        }
      }
    }
  }

  // Convert maps to arrays
  const result: ExtractionResult = {
    skaters: Array.from(skaterMap.values()),
    spots: Array.from(spotMap.values()),
    photographers: Array.from(photographerMap.values()),
    brands: Array.from(brandMap.values()),
    tricks: Array.from(trickMap.values()),
    events: Array.from(eventMap.values()),
    locations: Array.from(locationMap.values()),
  };

  console.log(`\nHybrid (Vision+OCR) extraction complete:`);
  console.log(`  Skaters: ${result.skaters.length}`);
  console.log(`  Spots: ${result.spots.length}`);
  console.log(`  Photographers: ${result.photographers.length}`);
  console.log(`  Brands: ${result.brands.length}`);
  console.log(`  Tricks: ${result.tricks.length}`);
  console.log(`  Events: ${result.events.length}`);
  console.log(`  Locations: ${result.locations.length}`);

  return result;
}

/**
 * Extract entities page-by-page for better quality
 * This processes each page individually and aggregates results
 */
export async function extractEntitiesPageByPage(
  magazineId: number,
  options: { maxPages?: number; concurrency?: number } = {}
): Promise<ExtractionResult> {
  const { maxPages, concurrency = 3 } = options;

  // Get magazine info
  const magazine = db
    .select()
    .from(magazines)
    .where(eq(magazines.id, magazineId))
    .get();

  if (!magazine) {
    throw new Error(`Magazine ${magazineId} not found`);
  }

  // Get pages
  let pages = db
    .select()
    .from(magazinePages)
    .where(eq(magazinePages.magazineId, magazineId))
    .all()
    .sort((a, b) => a.pageNumber - b.pageNumber);

  if (maxPages && maxPages > 0) {
    pages = pages.slice(0, maxPages);
    console.log(`Limited to ${maxPages} page(s) for testing`);
  }

  if (pages.length === 0) {
    throw new Error(`No pages found for magazine ${magazineId}`);
  }

  console.log(`Processing ${pages.length} pages (${concurrency} at a time)...`);

  // Aggregate maps for deduplication
  const skaterMap = new Map<string, ExtractedSkater>();
  const spotMap = new Map<string, ExtractedSpot>();
  const photographerMap = new Map<string, ExtractedPhotographer>();
  const brandMap = new Map<string, ExtractedBrand>();
  const trickMap = new Map<string, ExtractedTrick>();
  const eventMap = new Map<string, ExtractedEvent>();
  const locationMap = new Map<string, ExtractedLocation>();

  // Process pages in batches
  for (let i = 0; i < pages.length; i += concurrency) {
    const batch = pages.slice(i, i + concurrency);
    const batchPromises = batch.map(async (page) => {
      process.stdout.write(`  Page ${page.pageNumber}...`);
      const result = await extractFromPage(
        magazine.title,
        magazine.year,
        page.pageNumber,
        page.textContent || ""
      );
      console.log(` ✓ (${result.skaters.length}s, ${result.tricks.length}t, ${result.photographers.length}p)`);
      return { pageNumber: page.pageNumber, result };
    });

    const batchResults = await Promise.all(batchPromises);

    // Aggregate results
    for (const { pageNumber, result } of batchResults) {
      // Skaters
      for (const s of result.skaters || []) {
        if (!s.name) continue;
        const key = s.name.toLowerCase().trim();
        if (skaterMap.has(key)) {
          const existing = skaterMap.get(key)!;
          if (!existing.pageNumbers.includes(pageNumber)) {
            existing.pageNumbers.push(pageNumber);
          }
        } else {
          skaterMap.set(key, {
            name: s.name,
            pageNumbers: [pageNumber],
            context: (s.context as any) || "mention",
          });
        }
      }

      // Spots
      for (const s of result.spots || []) {
        if (!s.name) continue;
        const key = s.name.toLowerCase().trim();
        if (spotMap.has(key)) {
          const existing = spotMap.get(key)!;
          if (!existing.pageNumbers.includes(pageNumber)) {
            existing.pageNumbers.push(pageNumber);
          }
        } else {
          spotMap.set(key, {
            name: s.name,
            city: s.city || undefined,
            state: s.state || undefined,
            type: (s.type as any) || undefined,
            pageNumbers: [pageNumber],
            address: s.address || undefined,
            streetNumber: s.streetNumber || undefined,
            streetName: s.streetName || undefined,
            zipcode: s.zipcode || undefined,
            phone: s.phone || undefined,
          });
        }
      }

      // Photographers
      for (const p of result.photographers || []) {
        if (!p.name) continue;
        const key = p.name.toLowerCase().trim();
        if (photographerMap.has(key)) {
          const existing = photographerMap.get(key)!;
          if (!existing.pageNumbers.includes(pageNumber)) {
            existing.pageNumbers.push(pageNumber);
          }
        } else {
          photographerMap.set(key, {
            name: p.name,
            pageNumbers: [pageNumber],
          });
        }
      }

      // Brands
      for (const b of result.brands || []) {
        if (!b.name) continue;
        const key = b.name.toLowerCase().trim();
        if (brandMap.has(key)) {
          const existing = brandMap.get(key)!;
          if (!existing.pageNumbers.includes(pageNumber)) {
            existing.pageNumbers.push(pageNumber);
          }
        } else {
          brandMap.set(key, {
            name: b.name,
            category: (b.category as any) || undefined,
            pageNumbers: [pageNumber],
            context: (b.context as any) || "mention",
          });
        }
      }

      // Tricks
      for (const t of result.tricks || []) {
        if (!t.name) continue;
        const key = t.name.toLowerCase().trim();
        if (trickMap.has(key)) {
          const existing = trickMap.get(key)!;
          if (!existing.pageNumbers.includes(pageNumber)) {
            existing.pageNumbers.push(pageNumber);
          }
        } else {
          trickMap.set(key, {
            name: t.name,
            pageNumbers: [pageNumber],
            performedBy: t.performedBy || undefined,
            location: t.location || undefined,
          });
        }
      }

      // Events
      for (const e of result.events || []) {
        if (!e.name) continue;
        const key = e.name.toLowerCase().trim();
        if (eventMap.has(key)) {
          const existing = eventMap.get(key)!;
          if (!existing.pageNumbers.includes(pageNumber)) {
            existing.pageNumbers.push(pageNumber);
          }
        } else {
          eventMap.set(key, {
            name: e.name,
            date: e.date || undefined,
            location: e.location || undefined,
            pageNumbers: [pageNumber],
          });
        }
      }

      // Locations
      for (const l of result.locations || []) {
        if (!l.name) continue;
        const key = l.name.toLowerCase().trim();
        if (locationMap.has(key)) {
          const existing = locationMap.get(key)!;
          if (!existing.pageNumbers.includes(pageNumber)) {
            existing.pageNumbers.push(pageNumber);
          }
        } else {
          locationMap.set(key, {
            name: l.name,
            type: (l.type as any) || undefined,
            streetName: l.streetName || undefined,
            streetNumber: l.streetNumber || undefined,
            address: l.address || undefined,
            zipcode: l.zipcode || undefined,
            neighborhood: l.neighborhood || undefined,
            city: l.city || undefined,
            state: l.state || undefined,
            country: l.country || undefined,
            pageNumbers: [pageNumber],
          });
        }
      }
    }
  }

  // Convert maps to arrays
  const result: ExtractionResult = {
    skaters: Array.from(skaterMap.values()),
    spots: Array.from(spotMap.values()),
    photographers: Array.from(photographerMap.values()),
    brands: Array.from(brandMap.values()),
    tricks: Array.from(trickMap.values()),
    events: Array.from(eventMap.values()),
    locations: Array.from(locationMap.values()),
  };

  console.log(`\nExtraction complete:`);
  console.log(`  Skaters: ${result.skaters.length}`);
  console.log(`  Spots: ${result.spots.length}`);
  console.log(`  Photographers: ${result.photographers.length}`);
  console.log(`  Brands: ${result.brands.length}`);
  console.log(`  Tricks: ${result.tricks.length}`);
  console.log(`  Events: ${result.events.length}`);
  console.log(`  Locations: ${result.locations.length}`);

  return result;
}

/**
 * Get or create an entity by name, returns the ID
 */
function getOrCreateSkater(name: string): number {
  const existing = db.select().from(skaters).where(eq(skaters.name, name)).get();
  if (existing) return existing.id;

  const result = db.insert(skaters).values({ name }).returning().all();
  return result[0].id;
}

function getOrCreateSpot(
  name: string,
  city?: string,
  state?: string,
  type?: string,
  addressInfo?: {
    address?: string;
    streetNumber?: string;
    streetName?: string;
    zipcode?: string;
    phone?: string;
  }
): number {
  const existing = db.select().from(spots).where(eq(spots.name, name)).get();

  // If spot exists but has no location, try to add one if we have address info
  if (existing) {
    if (!existing.locationId && addressInfo && (addressInfo.address || addressInfo.streetName || addressInfo.zipcode)) {
      // Create a location and link it to the existing spot
      const locationName = addressInfo.address ||
        [addressInfo.streetNumber, addressInfo.streetName].filter(Boolean).join(" ") ||
        `${name} Address`;

      const locationResult = db
        .insert(locations)
        .values({
          name: locationName,
          type: "address",
          address: addressInfo.address || null,
          streetNumber: addressInfo.streetNumber || null,
          streetName: addressInfo.streetName || null,
          zipcode: addressInfo.zipcode || null,
          city: city || existing.city || null,
          state: state || existing.state || null,
          country: "USA",
        })
        .returning()
        .all();

      // Update spot with location link and phone
      db.update(spots)
        .set({
          locationId: locationResult[0].id,
          phone: addressInfo.phone || existing.phone || null,
        })
        .where(eq(spots.id, existing.id))
        .run();
    }
    return existing.id;
  }

  // If we have address info, create a linked location for new spot
  let locationId: number | null = null;
  if (addressInfo && (addressInfo.address || addressInfo.streetName || addressInfo.zipcode)) {
    const locationName = addressInfo.address ||
      [addressInfo.streetNumber, addressInfo.streetName].filter(Boolean).join(" ") ||
      `${name} Address`;

    const locationResult = db
      .insert(locations)
      .values({
        name: locationName,
        type: "address",
        address: addressInfo.address || null,
        streetNumber: addressInfo.streetNumber || null,
        streetName: addressInfo.streetName || null,
        zipcode: addressInfo.zipcode || null,
        city: city || null,
        state: state || null,
        country: "USA",
      })
      .returning()
      .all();
    locationId = locationResult[0].id;
  }

  const result = db
    .insert(spots)
    .values({
      name,
      city: city || null,
      state: state || null,
      type: type as any || null,
      locationId,
      phone: addressInfo?.phone || null,
    })
    .returning()
    .all();
  return result[0].id;
}

function getOrCreatePhotographer(name: string): number {
  const existing = db.select().from(photographers).where(eq(photographers.name, name)).get();
  if (existing) return existing.id;

  const result = db.insert(photographers).values({ name }).returning().all();
  return result[0].id;
}

function getOrCreateBrand(name: string, category?: string): number {
  const existing = db.select().from(brands).where(eq(brands.name, name)).get();
  if (existing) return existing.id;

  const result = db
    .insert(brands)
    .values({ name, category: category as any || null })
    .returning()
    .all();
  return result[0].id;
}

function getOrCreateTrick(name: string): number {
  // Normalize trick name to lowercase
  const normalizedName = name.toLowerCase().trim();
  const existing = db.select().from(tricks).where(eq(tricks.name, normalizedName)).get();
  if (existing) return existing.id;

  const result = db.insert(tricks).values({ name: normalizedName }).returning().all();
  return result[0].id;
}

function getOrCreateEvent(name: string, date?: string, location?: string): number {
  const existing = db.select().from(events).where(eq(events.name, name)).get();
  if (existing) return existing.id;

  const result = db
    .insert(events)
    .values({ name, date: date || null, location: location || null })
    .returning()
    .all();
  return result[0].id;
}

function getOrCreateLocation(data: ExtractedLocation): number {
  const existing = db.select().from(locations).where(eq(locations.name, data.name)).get();
  if (existing) return existing.id;

  const result = db
    .insert(locations)
    .values({
      name: data.name,
      type: (data.type as any) || null,
      streetName: data.streetName || null,
      streetNumber: data.streetNumber || null,
      address: data.address || null,
      zipcode: data.zipcode || null,
      neighborhood: data.neighborhood || null,
      city: data.city || null,
      state: data.state || null,
      country: data.country || null,
    })
    .returning()
    .all();
  return result[0].id;
}

/**
 * Save extraction results to database
 */
export async function saveExtractionResults(
  magazineId: number,
  results: ExtractionResult,
  confidenceScore: number = 0.8
): Promise<void> {
  console.log("\nSaving extraction results...");

  // Save skaters
  for (const s of results.skaters) {
    const skaterId = getOrCreateSkater(s.name);
    db.insert(magazineAppearances)
      .values({
        magazineId,
        entityType: "skater",
        entityId: skaterId,
        pageNumbers: s.pageNumbers,
        context: s.context,
        confidenceScore,
        verified: false,
      })
      .run();
    console.log(`  + Skater: ${s.name} (pages ${s.pageNumbers.join(", ")})`);
  }

  // Save spots
  for (const s of results.spots) {
    const spotId = getOrCreateSpot(s.name, s.city, s.state, s.type, {
      address: s.address,
      streetNumber: s.streetNumber,
      streetName: s.streetName,
      zipcode: s.zipcode,
      phone: s.phone,
    });
    db.insert(magazineAppearances)
      .values({
        magazineId,
        entityType: "spot",
        entityId: spotId,
        pageNumbers: s.pageNumbers,
        context: "feature",
        confidenceScore,
        verified: false,
      })
      .run();
    const addrInfo = s.address || s.streetName ? ` @ ${s.address || s.streetName}` : "";
    console.log(`  + Spot: ${s.name}${addrInfo} (pages ${s.pageNumbers.join(", ")})`);
  }

  // Save photographers
  for (const p of results.photographers) {
    const photographerId = getOrCreatePhotographer(p.name);
    db.insert(magazineAppearances)
      .values({
        magazineId,
        entityType: "photographer",
        entityId: photographerId,
        pageNumbers: p.pageNumbers,
        context: "photo",
        confidenceScore,
        verified: false,
      })
      .run();
    console.log(`  + Photographer: ${p.name} (pages ${p.pageNumbers.join(", ")})`);
  }

  // Save brands
  for (const b of results.brands) {
    const brandId = getOrCreateBrand(b.name, b.category);
    db.insert(magazineAppearances)
      .values({
        magazineId,
        entityType: "brand",
        entityId: brandId,
        pageNumbers: b.pageNumbers,
        context: b.context,
        confidenceScore,
        verified: false,
      })
      .run();
    console.log(`  + Brand: ${b.name} (pages ${b.pageNumbers.join(", ")})`);
  }

  // Save tricks and trick mentions
  for (const t of results.tricks) {
    const trickId = getOrCreateTrick(t.name);

    // Also create a general appearance
    db.insert(magazineAppearances)
      .values({
        magazineId,
        entityType: "trick",
        entityId: trickId,
        pageNumbers: t.pageNumbers,
        context: "feature",
        confidenceScore,
        verified: false,
      })
      .run();

    // If we have skater/spot info, create a trick mention
    if (t.performedBy || t.location) {
      let skaterId: number | null = null;
      let spotId: number | null = null;

      if (t.performedBy) {
        // Try to find the skater
        const skater = db.select().from(skaters).where(eq(skaters.name, t.performedBy)).get();
        if (skater) skaterId = skater.id;
      }

      if (t.location) {
        // Try to find the spot
        const spot = db.select().from(spots).where(eq(spots.name, t.location)).get();
        if (spot) spotId = spot.id;
      }

      for (const pageNum of t.pageNumbers) {
        db.insert(trickMentions)
          .values({
            magazineId,
            trickId,
            skaterId,
            spotId,
            pageNumber: pageNum,
            confidenceScore,
            verified: false,
          })
          .run();
      }
    }

    console.log(`  + Trick: ${t.name} (pages ${t.pageNumbers.join(", ")})`);
  }

  // Save events
  for (const e of results.events) {
    const eventId = getOrCreateEvent(e.name, e.date, e.location);
    db.insert(magazineAppearances)
      .values({
        magazineId,
        entityType: "event",
        entityId: eventId,
        pageNumbers: e.pageNumbers,
        context: "feature",
        confidenceScore,
        verified: false,
      })
      .run();
    console.log(`  + Event: ${e.name} (pages ${e.pageNumbers.join(", ")})`);
  }

  // Save locations
  for (const l of results.locations) {
    const locationId = getOrCreateLocation(l);
    db.insert(magazineAppearances)
      .values({
        magazineId,
        entityType: "location",
        entityId: locationId,
        pageNumbers: l.pageNumbers,
        context: "mention",
        confidenceScore,
        verified: false,
      })
      .run();
    console.log(`  + Location: ${l.name} (pages ${l.pageNumbers.join(", ")})`);
  }

  // Update magazine status
  db.update(magazines)
    .set({ status: "review" })
    .where(eq(magazines.id, magazineId))
    .run();

  console.log("\nExtraction complete!");
}
