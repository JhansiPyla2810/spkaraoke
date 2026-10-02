import { sql } from "drizzle-orm";
import { db } from "../src/lib/db";

async function main() {
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
  console.log("access_views table ready");
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
