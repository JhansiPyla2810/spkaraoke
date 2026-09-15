import { createClient } from '@libsql/client';
import fs from 'node:fs';
import path from 'node:path';

const url = process.env.TURSO_DATABASE_URL ?? 'file:local.db';
const authToken = process.env.TURSO_AUTH_TOKEN;
const client = createClient(authToken ? { url, authToken } : { url });

async function main() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS songs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      movie TEXT NOT NULL DEFAULT '',
      hero TEXT NOT NULL DEFAULT '',
      language TEXT NOT NULL DEFAULT 'Telugu',
      created_at INTEGER NOT NULL
    );
  `);

  const { rows } = await client.execute('SELECT COUNT(*) as c FROM songs');
  const existing = Number(rows[0].c);
  if (existing > 0) {
    console.log(`songs table already has ${existing} rows — skipping seed. Delete local.db to reseed.`);
    return;
  }

  const dataPath = path.join(__dirname, 'songs-seed.json');
  const data: { title: string; movie: string; hero: string; language: string }[] = JSON.parse(
    fs.readFileSync(dataPath, 'utf8')
  );

  const now = Date.now();
  const batchSize = 200;
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    const stmts = batch.map((s) => ({
      sql: 'INSERT INTO songs (title, movie, hero, language, created_at) VALUES (?, ?, ?, ?, ?)',
      args: [s.title, s.movie, s.hero, s.language, now],
    }));
    await client.batch(stmts, 'write');
    console.log(`inserted ${Math.min(i + batchSize, data.length)}/${data.length}`);
  }
  console.log('seed complete');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
