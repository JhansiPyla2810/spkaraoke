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

  return NextResponse.json({ results });
}
