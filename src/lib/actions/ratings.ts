"use server";

import { auth } from "@/lib/auth";
import { db, userRatings, media } from "@/lib/db";
import { eq, and, avg, count } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function submitRating(
  mediaId: number,
  rating: number,
  review?: string
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Must be logged in to rate" };
  }

  if (rating < 1 || rating > 5) {
    return { success: false, error: "Rating must be between 1 and 5" };
  }

  try {
    // Check if user already rated this media
    const existing = db
      .select()
      .from(userRatings)
      .where(
        and(
          eq(userRatings.userId, session.user.id),
          eq(userRatings.mediaId, mediaId)
        )
      )
      .get();

    if (existing) {
      // Update existing rating
      db.update(userRatings)
        .set({
          rating,
          review: review || null,
          updatedAt: new Date(),
        })
        .where(eq(userRatings.id, existing.id))
        .run();
    } else {
      // Create new rating
      db.insert(userRatings)
        .values({
          userId: session.user.id,
          mediaId,
          rating,
          review: review || null,
        })
        .run();
    }

    revalidatePath(`/media/${mediaId}`);
    revalidatePath(`/magazines/${mediaId}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to submit rating:", error);
    return { success: false, error: "Failed to submit rating" };
  }
}

export async function deleteRating(mediaId: number) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Must be logged in" };
  }

  try {
    db.delete(userRatings)
      .where(
        and(
          eq(userRatings.userId, session.user.id),
          eq(userRatings.mediaId, mediaId)
        )
      )
      .run();

    revalidatePath(`/media/${mediaId}`);
    revalidatePath(`/magazines/${mediaId}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to delete rating:", error);
    return { success: false, error: "Failed to delete rating" };
  }
}

export async function getUserRating(mediaId: number) {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  return db
    .select()
    .from(userRatings)
    .where(
      and(
        eq(userRatings.userId, session.user.id),
        eq(userRatings.mediaId, mediaId)
      )
    )
    .get() || null;
}

export async function getMediaRatings(mediaId: number) {
  const ratings = db
    .select()
    .from(userRatings)
    .where(eq(userRatings.mediaId, mediaId))
    .all();

  const totalRatings = ratings.length;
  const averageRating =
    totalRatings > 0
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings
      : 0;

  // Get ratings with reviews
  const reviews = ratings.filter((r) => r.review);

  return {
    totalRatings,
    averageRating: Math.round(averageRating * 10) / 10,
    reviews,
  };
}
