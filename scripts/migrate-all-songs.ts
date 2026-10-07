import { getAccessTokenFromRefreshToken } from "../src/lib/googleAuth";

const ALL_SONGS_FOLDER = "1HmTkPZi8DaJTT_lfGRnSpdN3nv5ClSgs";
const SOURCE_FOLDER = "1W5PvhYe1VArIh5Cnzaiu1OVcLt4pQ1ke"; // SATYA PYLA KARAOKE

async function listChildren(folderId: string, token: string) {
  const files: { id: string; name: string; mimeType: string }[] = [];
  let pageToken: string | undefined;
  do {
    const params = new URLSearchParams({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "nextPageToken,files(id,name,mimeType)",
      pageSize: "1000",
      supportsAllDrives: "true",
      includeItemsFromAllDrives: "true",
    });
    if (pageToken) params.set("pageToken", pageToken);
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = (await res.json()) as { files?: typeof files; nextPageToken?: string };
    files.push(...(data.files ?? []));
    pageToken = data.nextPageToken;
  } while (pageToken);
  return files;
}

async function trashFile(fileId: string, token: string) {
  await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?supportsAllDrives=true`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ trashed: true }),
  });
}

async function copyFile(fileId: string, targetParent: string, token: string) {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}/copy?supportsAllDrives=true&fields=id`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ parents: [targetParent] }),
    }
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Copy failed (${res.status}): ${body}`);
  }
}

async function runWithConcurrency<T>(items: T[], limit: number, fn: (item: T, i: number) => Promise<void>) {
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: limit }, worker));
}

async function main() {
  const token = await getAccessTokenFromRefreshToken();

  console.log("Listing current All Songs contents...");
  const existing = await listChildren(ALL_SONGS_FOLDER, token);
  console.log(`Trashing ${existing.length} existing items...`);
  let trashedCount = 0;
  await runWithConcurrency(existing, 8, async (item) => {
    await trashFile(item.id, token);
    trashedCount++;
    if (trashedCount % 10 === 0) console.log(`  trashed ${trashedCount}/${existing.length}`);
  });
  console.log(`Done trashing ${trashedCount} items.`);

  console.log("Listing SATYA PYLA KARAOKE contents...");
  const source = await listChildren(SOURCE_FOLDER, token);
  const folders = source.filter((f) => f.mimeType === "application/vnd.google-apps.folder");
  const files = source.filter((f) => f.mimeType !== "application/vnd.google-apps.folder");
  console.log(`Found ${files.length} files to copy (${folders.length} subfolders will be skipped/reported).`);
  if (folders.length) {
    console.log("Subfolders found (not copied, review manually):", folders.map((f) => f.name));
  }

  let copied = 0;
  let failed = 0;
  const failures: string[] = [];
  await runWithConcurrency(files, 6, async (file) => {
    try {
      await copyFile(file.id, ALL_SONGS_FOLDER, token);
      copied++;
      if (copied % 10 === 0) console.log(`  copied ${copied}/${files.length}`);
    } catch (e) {
      failed++;
      failures.push(file.name);
      console.error(`  FAILED: ${file.name} — ${e instanceof Error ? e.message : e}`);
    }
  });

  console.log("---");
  console.log(`Copied: ${copied}, Failed: ${failed}`);
  if (failures.length) console.log("Failed files:", failures);
}

main()
  .then(() => {
    console.log("Migration complete.");
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
