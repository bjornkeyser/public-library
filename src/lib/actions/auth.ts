"use server";

import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";
import { isRedirectError } from "next/dist/client/components/redirect-error";

type ActionState = { error: string } | null;

export async function register(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const username = formData.get("username") as string;

  if (!email || !password || !username) {
    return { error: "All fields are required" };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters" };
  }

  if (username.length < 3) {
    return { error: "Username must be at least 3 characters" };
  }

  // Username validation - alphanumeric and underscores only
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { error: "Username can only contain letters, numbers, and underscores" };
  }

  // Check if email already exists
  const existingEmail = db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .get();

  if (existingEmail) {
    return { error: "Email already registered" };
  }

  // Check if username already exists
  const existingUsername = db
    .select()
    .from(users)
    .where(eq(users.username, username.toLowerCase()))
    .get();

  if (existingUsername) {
    return { error: "Username already taken" };
  }

  // Hash password and create user
  const passwordHash = await bcrypt.hash(password, 12);
  const userId = crypto.randomUUID();

  db.insert(users)
    .values({
      id: userId,
      email,
      name: username,
      username: username.toLowerCase(),
      displayName: username,
      passwordHash,
    })
    .run();

  // Sign in the user - let redirect errors propagate
  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/",
    });
  } catch (error) {
    // Let redirect errors through (this is how NextAuth handles successful auth)
    if (isRedirectError(error)) {
      throw error;
    }
    if (error instanceof AuthError) {
      return { error: "Failed to sign in after registration" };
    }
    throw error;
  }

  return null;
}

export async function login(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/",
    });
  } catch (error) {
    // Let redirect errors through (this is how NextAuth handles successful auth)
    if (isRedirectError(error)) {
      throw error;
    }
    if (error instanceof AuthError) {
      return { error: "Invalid email or password" };
    }
    throw error;
  }

  return null;
}
