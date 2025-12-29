"use server";

import { db, userCollections, media } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

type CollectionStatus = "have" | "want" | "had" | null;

export async function getCollectionStatus(mediaId: number): Promise<CollectionStatus> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const item = db
    .select()
    .from(userCollections)
    .where(
      and(
        eq(userCollections.userId, session.user.id),
        eq(userCollections.mediaId, mediaId)
      )
    )
    .get();

  return item?.status as CollectionStatus || null;
}

export async function setCollectionStatus(
  mediaId: number,
  status: CollectionStatus
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    if (status === null) {
      // Remove from collection
      db.delete(userCollections)
        .where(
          and(
            eq(userCollections.userId, session.user.id),
            eq(userCollections.mediaId, mediaId)
          )
        )
        .run();
    } else {
      // Check if item exists
      const existing = db
        .select()
        .from(userCollections)
        .where(
          and(
            eq(userCollections.userId, session.user.id),
            eq(userCollections.mediaId, mediaId)
          )
        )
        .get();

      if (existing) {
        // Update status
        db.update(userCollections)
          .set({ status })
          .where(eq(userCollections.id, existing.id))
          .run();
      } else {
        // Insert new
        db.insert(userCollections)
          .values({
            userId: session.user.id,
            mediaId,
            status,
          })
          .run();
      }
    }

    revalidatePath("/collection");
    return { success: true };
  } catch (error) {
    console.error("Collection update error:", error);
    return { success: false, error: "Failed to update collection" };
  }
}

export async function getCollectionStats(mediaId: number): Promise<{ have: number; want: number }> {
  const stats = db
    .select()
    .from(userCollections)
    .where(eq(userCollections.mediaId, mediaId))
    .all();

  return {
    have: stats.filter((s) => s.status === "have").length,
    want: stats.filter((s) => s.status === "want").length,
  };
}

export async function getUserCollection(userId: string) {
  const items = db
    .select()
    .from(userCollections)
    .where(eq(userCollections.userId, userId))
    .all();

  // Get media details for each item
  const mediaItems = db.select().from(media).all();
  const mediaMap = new Map(mediaItems.map((m) => [m.id, m]));

  return items.map((item) => ({
    ...item,
    media: mediaMap.get(item.mediaId),
  }));
}
