"use server";

import { db, magazineAppearances, skaters, spots, photographers, brands, tricks, events, locations } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

type EntityType = "skater" | "spot" | "photographer" | "brand" | "trick" | "event" | "location";

/**
 * Mark an appearance as verified
 */
export async function verifyAppearance(appearanceId: number, magazineId: number) {
  db.update(magazineAppearances)
    .set({ verified: true })
    .where(eq(magazineAppearances.id, appearanceId))
    .run();

  revalidatePath(`/magazines/${magazineId}`);
  revalidatePath(`/magazines/${magazineId}/review`);
  return { success: true };
}

/**
 * Reject (delete) an appearance
 */
export async function rejectAppearance(appearanceId: number, magazineId: number) {
  db.delete(magazineAppearances)
    .where(eq(magazineAppearances.id, appearanceId))
    .run();

  revalidatePath(`/magazines/${magazineId}`);
  revalidatePath(`/magazines/${magazineId}/review`);
  return { success: true };
}

/**
 * Verify all appearances for a magazine
 */
export async function verifyAllAppearances(magazineId: number) {
  db.update(magazineAppearances)
    .set({ verified: true })
    .where(eq(magazineAppearances.magazineId, magazineId))
    .run();

  revalidatePath(`/magazines/${magazineId}`);
  revalidatePath(`/magazines/${magazineId}/review`);
  return { success: true };
}

/**
 * Update entity name (fixes typos)
 */
export async function updateEntityName(
  entityType: EntityType,
  entityId: number,
  newName: string,
  magazineId: number
) {
  const tables = {
    skater: skaters,
    spot: spots,
    photographer: photographers,
    brand: brands,
    trick: tricks,
    event: events,
    location: locations,
  };

  const table = tables[entityType];

  db.update(table)
    .set({ name: newName })
    .where(eq(table.id, entityId))
    .run();

  revalidatePath(`/magazines/${magazineId}`);
  revalidatePath(`/magazines/${magazineId}/review`);
  return { success: true };
}

/**
 * Update magazine status
 */
export async function updateMagazineStatus(magazineId: number, status: "pending" | "processing" | "review" | "published") {
  const { magazines } = await import("@/lib/db");

  db.update(magazines)
    .set({ status })
    .where(eq(magazines.id, magazineId))
    .run();

  revalidatePath(`/magazines/${magazineId}`);
  revalidatePath(`/magazines/${magazineId}/review`);
  return { success: true };
}
