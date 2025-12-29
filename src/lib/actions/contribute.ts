"use server";

import { db, media, users } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

type ActionResult = { success: boolean; error?: string; mediaId?: number };

export async function submitMedia(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  const mediaType = formData.get("mediaType") as string;
  const title = formData.get("title") as string;
  const year = parseInt(formData.get("year") as string, 10);
  const month = formData.get("month") ? parseInt(formData.get("month") as string, 10) : null;
  const issue = formData.get("issue") ? parseInt(formData.get("issue") as string, 10) : null;
  const volume = formData.get("volume") ? parseInt(formData.get("volume") as string, 10) : null;
  const description = formData.get("description") as string || null;
  const barcode = formData.get("barcode") as string || null;
  const runtimeMinutes = formData.get("runtimeMinutes")
    ? parseInt(formData.get("runtimeMinutes") as string, 10)
    : null;
  const coverImage = formData.get("coverImage") as File | null;

  // Validation
  if (!mediaType || !title || !year) {
    return { success: false, error: "Media type, title, and year are required" };
  }

  if (!["magazine", "vhs", "dvd", "bluray", "digital"].includes(mediaType)) {
    return { success: false, error: "Invalid media type" };
  }

  if (year < 1950 || year > new Date().getFullYear() + 1) {
    return { success: false, error: "Invalid year" };
  }

  let coverImagePath: string | null = null;

  // Handle cover image upload
  if (coverImage && coverImage.size > 0) {
    try {
      const bytes = await coverImage.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Create uploads directory if it doesn't exist
      const uploadsDir = path.join(process.cwd(), "public", "uploads", "covers");
      await mkdir(uploadsDir, { recursive: true });

      // Generate unique filename
      const ext = coverImage.name.split(".").pop() || "jpg";
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const filepath = path.join(uploadsDir, filename);

      await writeFile(filepath, buffer);
      coverImagePath = `/uploads/covers/${filename}`;
    } catch (error) {
      console.error("Failed to save cover image:", error);
      return { success: false, error: "Failed to upload cover image" };
    }
  }

  try {
    const result = db.insert(media).values({
      mediaType: mediaType as "magazine" | "vhs" | "dvd" | "bluray" | "digital",
      title,
      year,
      month,
      issue,
      volume,
      description,
      barcode,
      runtimeMinutes,
      coverImage: coverImagePath,
      completeness: "metadata",
      hasFullScans: false,
      status: "pending",
      verified: false,
      submittedBy: session.user.id,
    }).run();

    revalidatePath("/contribute");
    revalidatePath("/admin/submissions");

    return { success: true, mediaId: Number(result.lastInsertRowid) };
  } catch (error) {
    console.error("Failed to submit media:", error);
    return { success: false, error: "Failed to submit media" };
  }
}

export async function getPendingSubmissions() {
  const session = await auth();
  if (!session?.user?.id) return [];

  // Check if user is moderator or admin
  const user = db.select().from(users).where(eq(users.id, session.user.id)).get();
  if (!user || !["moderator", "admin"].includes(user.role || "")) {
    return [];
  }

  const submissions = db
    .select()
    .from(media)
    .where(eq(media.status, "pending"))
    .orderBy(desc(media.createdAt))
    .all();

  // Get submitter info
  const allUsers = db.select().from(users).all();
  const userMap = new Map(allUsers.map((u) => [u.id, u]));

  return submissions.map((s) => ({
    ...s,
    submitter: s.submittedBy ? userMap.get(s.submittedBy) : null,
  }));
}

export async function getUserSubmissions() {
  const session = await auth();
  if (!session?.user?.id) return [];

  return db
    .select()
    .from(media)
    .where(eq(media.submittedBy, session.user.id))
    .orderBy(desc(media.createdAt))
    .all();
}

export async function approveSubmission(mediaId: number): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  // Check if user is moderator or admin
  const user = db.select().from(users).where(eq(users.id, session.user.id)).get();
  if (!user || !["moderator", "admin"].includes(user.role || "")) {
    return { success: false, error: "Not authorized" };
  }

  try {
    db.update(media)
      .set({
        status: "published",
        verified: true,
        verifiedBy: session.user.id,
        verifiedAt: new Date(),
      })
      .where(eq(media.id, mediaId))
      .run();

    revalidatePath("/admin/submissions");
    revalidatePath("/magazines");
    revalidatePath("/");

    return { success: true };
  } catch (error) {
    console.error("Failed to approve submission:", error);
    return { success: false, error: "Failed to approve submission" };
  }
}

export async function rejectSubmission(mediaId: number): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  // Check if user is moderator or admin
  const user = db.select().from(users).where(eq(users.id, session.user.id)).get();
  if (!user || !["moderator", "admin"].includes(user.role || "")) {
    return { success: false, error: "Not authorized" };
  }

  try {
    db.update(media)
      .set({ status: "review" }) // Mark as needing review/rejected
      .where(eq(media.id, mediaId))
      .run();

    revalidatePath("/admin/submissions");

    return { success: true };
  } catch (error) {
    console.error("Failed to reject submission:", error);
    return { success: false, error: "Failed to reject submission" };
  }
}
