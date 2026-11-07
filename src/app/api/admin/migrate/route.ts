import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { isAuthed } from "@/lib/auth";
import { db } from "@/lib/db";

async function addColumnIfMissing(statement: string, label: string): Promise<string> {
  try {
    await db.run(sql.raw(statement));
    return `Added ${label}`;
  } catch (e) {
    const msg = e instanceof Error ? `${e.message} ${e.cause ?? ""}` : String(e);
    if (msg.includes("duplicate column")) return `${label} already exists, skipped`;
    throw e;
  }
}

export async function GET() {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = [
    await addColumnIfMissing(
      "ALTER TABLE access_grants ADD COLUMN client_email TEXT NOT NULL DEFAULT ''",
      "client_email column"
    ),
    await addColumnIfMissing(
      "ALTER TABLE access_grants ADD COLUMN drive_permission_id TEXT",
      "drive_permission_id column"
    ),
    await addColumnIfMissing(
      "ALTER TABLE access_grants ADD COLUMN starts_at INTEGER NOT NULL DEFAULT 0",
      "starts_at column"
    ),
    await addColumnIfMissing(
      "ALTER TABLE events ADD COLUMN locked_down_at INTEGER",
      "locked_down_at column"
    ),
    await addColumnIfMissing(
      "ALTER TABLE access_grants ADD COLUMN active_device_id TEXT",
      "active_device_id column"
    ),
    await addColumnIfMissing(
      "ALTER TABLE events ADD COLUMN is_protected INTEGER NOT NULL DEFAULT 0",
      "is_protected column"
    ),
    await addColumnIfMissing(
      "ALTER TABLE access_grants ADD COLUMN active_tab_id TEXT",
      "active_tab_id column"
    ),
    await addColumnIfMissing(
      "ALTER TABLE access_grants ADD COLUMN pin TEXT NOT NULL DEFAULT ''",
      "pin column"
    ),
  ];

  await db.run(
    sql.raw(`
      CREATE TABLE IF NOT EXISTS access_views (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        grant_id INTEGER NOT NULL,
        ip TEXT NOT NULL,
        user_agent TEXT NOT NULL,
        viewed_at INTEGER NOT NULL
      )
    `)
  );
  results.push("access_views table ready");

  const protect = await db.run(
    sql.raw(`UPDATE events SET is_protected = 1 WHERE name = 'All Songs' AND is_protected = 0`)
  );
  results.push(`"All Songs" protection: ${protect.rowsAffected ?? 0} row(s) updated`);

  await db.run(
    sql.raw(`
      CREATE TABLE IF NOT EXISTS subscribers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL DEFAULT '',
        created_at INTEGER NOT NULL
      )
    `)
  );
  results.push("subscribers table ready");

  await db.run(
    sql.raw(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subscriber_id INTEGER NOT NULL,
        plan TEXT NOT NULL,
        starts_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        suspended INTEGER NOT NULL DEFAULT 0,
        revoked INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      )
    `)
  );
  results.push("subscriptions table ready");

  await db.run(
    sql.raw(`
      CREATE TABLE IF NOT EXISTS app_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subscriber_id INTEGER NOT NULL,
        session_token TEXT NOT NULL UNIQUE,
        device_id TEXT NOT NULL,
        last_seen_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      )
    `)
  );
  results.push("app_sessions table ready");

  await db.run(
    sql.raw(`
      CREATE TABLE IF NOT EXISTS devices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subscriber_id INTEGER NOT NULL,
        device_id TEXT NOT NULL UNIQUE,
        public_key TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        registered_at INTEGER NOT NULL,
        last_seen_at INTEGER NOT NULL
      )
    `)
  );
  results.push("devices table ready");

  await db.run(
    sql.raw(`
      CREATE TABLE IF NOT EXISTS offline_assets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        video_id TEXT NOT NULL,
        asset_id TEXT NOT NULL UNIQUE,
        asset_version INTEGER NOT NULL,
        encrypted_content_key TEXT NOT NULL,
        manifest TEXT NOT NULL,
        storage TEXT NOT NULL,
        storage_ref TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'ready',
        created_at INTEGER NOT NULL
      )
    `)
  );
  results.push("offline_assets table ready");

  return NextResponse.json({ results });
}
