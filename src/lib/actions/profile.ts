"use server";

import { db, users, userCollections, userRatings, media, contributions } from "@/lib/db";
import { eq, and, desc, count } from "drizzle-orm";

export async function getUserByUsername(username: string) {
  return db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      name: users.name,
      image: users.image,
      bio: users.bio,
      location: users.location,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.username, username))
    .get();
}

export async function getUserCollection(userId: string) {
  const collection = db
    .select({
      id: userCollections.id,
      status: userCollections.status,
      addedAt: userCollections.addedAt,
      mediaId: media.id,
      mediaTitle: media.title,
      mediaType: media.mediaType,
      mediaCover: media.coverImage,
      mediaYear: media.year,
      mediaMonth: media.month,
      mediaIssue: media.issue,
    })
    .from(userCollections)
    .innerJoin(media, eq(userCollections.mediaId, media.id))
    .where(eq(userCollections.userId, userId))
    .orderBy(desc(userCollections.addedAt))
    .all();

  const have = collection.filter((c) => c.status === "have");
  const want = collection.filter((c) => c.status === "want");

  return { have, want };
}

export async function getUserRatings(userId: string) {
  return db
    .select({
      id: userRatings.id,
      rating: userRatings.rating,
      review: userRatings.review,
      createdAt: userRatings.createdAt,
      mediaId: media.id,
      mediaTitle: media.title,
      mediaType: media.mediaType,
      mediaCover: media.coverImage,
      mediaYear: media.year,
    })
    .from(userRatings)
    .innerJoin(media, eq(userRatings.mediaId, media.id))
    .where(eq(userRatings.userId, userId))
    .orderBy(desc(userRatings.createdAt))
    .all();
}

export async function getUserContributions(userId: string) {
  // Get media submitted by user
  const submissions = db
    .select({
      id: media.id,
      title: media.title,
      mediaType: media.mediaType,
      coverImage: media.coverImage,
      year: media.year,
      status: media.status,
      createdAt: media.createdAt,
    })
    .from(media)
    .where(eq(media.submittedBy, userId))
    .orderBy(desc(media.createdAt))
    .all();

  return submissions;
}

export async function getUserStats(userId: string) {
  const [haveCount] = db
    .select({ count: count() })
    .from(userCollections)
    .where(and(eq(userCollections.userId, userId), eq(userCollections.status, "have")))
    .all();

  const [wantCount] = db
    .select({ count: count() })
    .from(userCollections)
    .where(and(eq(userCollections.userId, userId), eq(userCollections.status, "want")))
    .all();

  const [ratingsCount] = db
    .select({ count: count() })
    .from(userRatings)
    .where(eq(userRatings.userId, userId))
    .all();

  const [contributionsCount] = db
    .select({ count: count() })
    .from(media)
    .where(eq(media.submittedBy, userId))
    .all();

  return {
    have: haveCount?.count || 0,
    want: wantCount?.count || 0,
    ratings: ratingsCount?.count || 0,
    contributions: contributionsCount?.count || 0,
  };
}
