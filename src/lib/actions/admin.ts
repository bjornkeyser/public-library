"use server";

import { revalidatePath } from "next/cache";
import {
  db,
  magazines,
  magazinePages,
  magazineAppearances,
  trickMentions,
  skaters,
  spots,
  photographers,
  brands,
  events,
  tricks,
  locations,
} from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { processPdf } from "@/lib/pdf/process";
import {
  extractEntitiesPageByPage,
  extractEntitiesWithVision,
  saveExtractionResults,
} from "@/lib/ai/extract";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

// === Upload & Creation ===

export async function uploadPdf(formData: FormData) {
  const file = formData.get("pdf") as File;
  const title = formData.get("title") as string;
  const year = parseInt(formData.get("year") as string, 10);
  const volume = formData.get("volume")
    ? parseInt(formData.get("volume") as string, 10)
    : null;
  const issue = formData.get("issue")
    ? parseInt(formData.get("issue") as string, 10)
    : null;
  const month = formData.get("month")
    ? parseInt(formData.get("month") as string, 10)
    : null;

  if (!file || !title || !year) {
    return { success: false, error: "Missing required fields" };
  }

  // Generate safe filename
  const timestamp = Date.now();
  const safeName = title.toLowerCase().replace(/[^a-z0-9]/g, "_");
  const filename = `${safeName}_${timestamp}.pdf`;

  // Ensure directory exists
  const magDir = path.join(process.cwd(), "public", "magazines");
  await mkdir(magDir, { recursive: true });

  // Write file
  const filePath = path.join(magDir, filename);
  const bytes = await file.arrayBuffer();
  await writeFile(filePath, Buffer.from(bytes));

  // Create magazine record
  const pdfPath = `/magazines/${filename}`;
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

  revalidatePath("/admin");

  return { success: true, magazineId: result[0].id };
}

// === OCR Processing ===

export async function runOcrProcessing(magazineId: number) {
  // Update status to processing
  db.update(magazines)
    .set({ status: "processing" })
    .where(eq(magazines.id, magazineId))
    .run();

  revalidatePath(`/admin/magazines/${magazineId}`);
  revalidatePath("/admin");

  const magazine = db
    .select()
    .from(magazines)
    .where(eq(magazines.id, magazineId))
    .get();

  if (!magazine?.pdfPath) {
    db.update(magazines)
      .set({ status: "pending" })
      .where(eq(magazines.id, magazineId))
      .run();
    return { success: false, error: "No PDF path found" };
  }

  try {
    // Get full path to PDF
    const pdfFullPath = path.join(process.cwd(), "public", magazine.pdfPath);

    // Run OCR processing
    const result = await processPdf(pdfFullPath, magazineId);

    // Clear existing pages
    db.delete(magazinePages)
      .where(eq(magazinePages.magazineId, magazineId))
      .run();

    // Insert new pages
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

    // Update status and cover
    db.update(magazines)
      .set({
        status: "review",
        coverImage: result.pages[0]?.imagePath || null,
      })
      .where(eq(magazines.id, magazineId))
      .run();

    revalidatePath(`/admin/magazines/${magazineId}`);
    revalidatePath(`/admin/magazines/${magazineId}/ocr`);
    revalidatePath("/admin");

    return { success: true, totalPages: result.totalPages };
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    db.update(magazines)
      .set({ status: "pending" })
      .where(eq(magazines.id, magazineId))
      .run();
    revalidatePath(`/admin/magazines/${magazineId}`);
    revalidatePath("/admin");
    return { success: false, error: errorMessage };
  }
}

// === OCR Text Editing ===

export async function updatePageText(
  magazineId: number,
  pageNumber: number,
  textContent: string
) {
  const page = db
    .select()
    .from(magazinePages)
    .where(
      and(
        eq(magazinePages.magazineId, magazineId),
        eq(magazinePages.pageNumber, pageNumber)
      )
    )
    .get();

  if (!page) {
    return { success: false, error: "Page not found" };
  }

  db.update(magazinePages)
    .set({ textContent })
    .where(eq(magazinePages.id, page.id))
    .run();

  revalidatePath(`/admin/magazines/${magazineId}/ocr`);
  return { success: true };
}

// === AI Extraction ===

export async function runAiExtraction(
  magazineId: number,
  options?: { useVision?: boolean }
) {
  // Clear existing extractions
  db.delete(magazineAppearances)
    .where(eq(magazineAppearances.magazineId, magazineId))
    .run();
  db.delete(trickMentions)
    .where(eq(trickMentions.magazineId, magazineId))
    .run();

  try {
    const results = options?.useVision
      ? await extractEntitiesWithVision(magazineId)
      : await extractEntitiesPageByPage(magazineId);

    await saveExtractionResults(magazineId, results);

    revalidatePath(`/admin/magazines/${magazineId}`);
    revalidatePath(`/magazines/${magazineId}`);
    revalidatePath(`/magazines/${magazineId}/review`);

    return {
      success: true,
      counts: {
        skaters: results.skaters.length,
        spots: results.spots.length,
        photographers: results.photographers.length,
        brands: results.brands.length,
        tricks: results.tricks.length,
        events: results.events.length,
      },
    };
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: errorMessage, counts: {} };
  }
}

// === Status Management ===

export async function setMagazineStatus(
  magazineId: number,
  status: "pending" | "processing" | "review" | "published"
) {
  db.update(magazines)
    .set({ status })
    .where(eq(magazines.id, magazineId))
    .run();

  revalidatePath(`/admin/magazines/${magazineId}`);
  revalidatePath(`/magazines/${magazineId}`);
  revalidatePath("/admin");

  return { success: true };
}

// === Delete Magazine ===

export async function deleteMagazine(magazineId: number) {
  // Delete related records first (if not using cascade)
  db.delete(magazineAppearances)
    .where(eq(magazineAppearances.magazineId, magazineId))
    .run();
  db.delete(trickMentions)
    .where(eq(trickMentions.magazineId, magazineId))
    .run();
  db.delete(magazinePages)
    .where(eq(magazinePages.magazineId, magazineId))
    .run();

  // Delete magazine
  db.delete(magazines).where(eq(magazines.id, magazineId)).run();

  revalidatePath("/admin");
  return { success: true };
}

// === Geocoding ===

export async function geocodeAllLocations() {
  const { locations, spots } = await import("@/lib/db");
  const { geocodeLocation, delay } = await import("@/lib/geocode");

  let geocodedLocations = 0;
  let geocodedSpots = 0;
  let failed = 0;

  // Get locations without coordinates
  const locationsToGeocode = db
    .select()
    .from(locations)
    .all()
    .filter((l) => !l.latitude && (l.city || l.state || l.address || l.name));

  console.log(`Geocoding ${locationsToGeocode.length} locations...`);

  for (const location of locationsToGeocode) {
    const result = await geocodeLocation({
      name: location.name,
      address: location.address,
      streetName: location.streetName,
      streetNumber: location.streetNumber,
      neighborhood: location.neighborhood,
      city: location.city,
      state: location.state,
      country: location.country,
      zipcode: location.zipcode,
    });

    if (result) {
      db.update(locations)
        .set({
          latitude: result.latitude,
          longitude: result.longitude,
        })
        .where(eq(locations.id, location.id))
        .run();
      geocodedLocations++;
      console.log(`  ✓ ${location.name} -> ${result.latitude}, ${result.longitude}`);
    } else {
      failed++;
      console.log(`  ✗ ${location.name} (no results)`);
    }

    // Rate limit: 1 request per second for Nominatim
    await delay(1100);
  }

  // Get spots without coordinates
  const spotsToGeocode = db
    .select()
    .from(spots)
    .all()
    .filter((s) => !s.latitude && (s.city || s.state || s.name));

  console.log(`Geocoding ${spotsToGeocode.length} spots...`);

  for (const spot of spotsToGeocode) {
    const result = await geocodeLocation({
      name: spot.name,
      city: spot.city,
      state: spot.state,
      country: spot.country,
    });

    if (result) {
      db.update(spots)
        .set({
          latitude: result.latitude,
          longitude: result.longitude,
        })
        .where(eq(spots.id, spot.id))
        .run();
      geocodedSpots++;
      console.log(`  ✓ ${spot.name} -> ${result.latitude}, ${result.longitude}`);
    } else {
      failed++;
      console.log(`  ✗ ${spot.name} (no results)`);
    }

    // Rate limit
    await delay(1100);
  }

  revalidatePath("/map");
  revalidatePath("/locations");
  revalidatePath("/spots");

  return {
    success: true,
    geocodedLocations,
    geocodedSpots,
    failed,
    total: locationsToGeocode.length + spotsToGeocode.length,
  };
}

// === Entity Merging ===

type EntityType = "skater" | "spot" | "photographer" | "brand" | "event" | "trick" | "location";

export async function mergeEntities(
  entityType: EntityType,
  keepId: number,
  mergeIds: number[]
) {
  // Update all magazine appearances to point to the kept entity
  for (const mergeId of mergeIds) {
    db.update(magazineAppearances)
      .set({ entityId: keepId })
      .where(
        and(
          eq(magazineAppearances.entityType, entityType),
          eq(magazineAppearances.entityId, mergeId)
        )
      )
      .run();

    // Handle trickMentions separately based on entity type
    if (entityType === "skater") {
      db.update(trickMentions)
        .set({ skaterId: keepId })
        .where(eq(trickMentions.skaterId, mergeId))
        .run();
    } else if (entityType === "spot") {
      db.update(trickMentions)
        .set({ spotId: keepId })
        .where(eq(trickMentions.spotId, mergeId))
        .run();
      db.update(events)
        .set({ spotId: keepId })
        .where(eq(events.spotId, mergeId))
        .run();
    } else if (entityType === "trick") {
      db.update(trickMentions)
        .set({ trickId: keepId })
        .where(eq(trickMentions.trickId, mergeId))
        .run();
    } else if (entityType === "location") {
      db.update(spots)
        .set({ locationId: keepId })
        .where(eq(spots.locationId, mergeId))
        .run();
    }

    // Delete the merged entity based on type
    switch (entityType) {
      case "skater":
        db.delete(skaters).where(eq(skaters.id, mergeId)).run();
        break;
      case "spot":
        db.delete(spots).where(eq(spots.id, mergeId)).run();
        break;
      case "photographer":
        db.delete(photographers).where(eq(photographers.id, mergeId)).run();
        break;
      case "brand":
        db.delete(brands).where(eq(brands.id, mergeId)).run();
        break;
      case "event":
        db.delete(events).where(eq(events.id, mergeId)).run();
        break;
      case "trick":
        db.delete(tricks).where(eq(tricks.id, mergeId)).run();
        break;
      case "location":
        db.delete(locations).where(eq(locations.id, mergeId)).run();
        break;
    }
  }

  // Revalidate paths
  revalidatePath("/admin/duplicates");
  revalidatePath(`/${entityType}s`);

  return { success: true, merged: mergeIds.length };
}
