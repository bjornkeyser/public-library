/**
 * Script to promote a user to admin role
 * Usage: npx tsx scripts/make-admin.ts <email>
 */

import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "data", "skate-mag.db");
const db = new Database(dbPath);

const email = process.argv[2];

if (!email) {
  console.log("Usage: npx tsx scripts/make-admin.ts <email>");
  console.log("\nExisting users:");
  const users = db.prepare("SELECT id, email, username, role FROM users").all();
  console.table(users);
  process.exit(1);
}

const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);

if (!user) {
  console.error(`User with email "${email}" not found.`);
  console.log("\nExisting users:");
  const users = db.prepare("SELECT id, email, username, role FROM users").all();
  console.table(users);
  process.exit(1);
}

db.prepare("UPDATE users SET role = 'admin' WHERE email = ?").run(email);

console.log(`✓ User "${email}" is now an admin.`);

db.close();
