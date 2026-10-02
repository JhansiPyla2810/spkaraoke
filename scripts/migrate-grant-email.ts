import { sql } from "drizzle-orm";
import { db } from "../src/lib/db";

async function addColumnIfMissing(statement: string, label: string) {
  try {
    await db.run(sql.raw(statement));
    console.log(`Added ${label}`);
  } catch (e) {
    const msg = e instanceof Error ? `${e.message} ${e.cause ?? ""}` : String(e);
    if (msg.includes("duplicate column")) {
      console.log(`${label} already exists, skipping`);
    } else {
      throw e;
    }
  }
}

async function main() {
  await addColumnIfMissing(
    "ALTER TABLE access_grants ADD COLUMN client_email TEXT NOT NULL DEFAULT ''",
    "client_email column"
  );
  await addColumnIfMissing(
    "ALTER TABLE access_grants ADD COLUMN drive_permission_id TEXT",
    "drive_permission_id column"
  );
}

main()
  .then(() => {
    console.log("Migration complete");
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
