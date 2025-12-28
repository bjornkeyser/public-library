import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";
import path from "path";

// Database path - stored in data folder at project root
const dbPath = path.join(process.cwd(), "data", "skate-mag.db");

// Create database connection
const sqlite = new Database(dbPath);

// Enable foreign keys
sqlite.pragma("foreign_keys = ON");

// Create Drizzle ORM instance
export const db = drizzle(sqlite, { schema });

// Export schema for convenience
export * from "./schema";
