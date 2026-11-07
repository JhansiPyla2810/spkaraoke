import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { events } from "@/lib/schema";
import { getAccessTokenFromRefreshToken } from "@/lib/googleAuth";

// Offline downloads read the catalog live from Drive - no separate prepared
// copy - so a newly uploaded video is downloadable immediately and a
// deleted one stops being downloadable immediately.
const ALL_SONGS_EVENT_NAME = "All Songs";

export type VideoMeta = { size: number; md5: string; mimeType: string; name: string };

async function allSongsFolderId(): Promise<string | null> {
  const [event] = await db.select().from(events).where(eq(events.name, ALL_SONGS_EVENT_NAME));
  return event?.driveFolderId ?? null;
}

// Returns null if the file doesn't exist, is trashed, isn't a video, or
// isn't in the All Songs folder - so a download can only ever pull a real
// catalog video, never an arbitrary Drive file ID.
export async function getCatalogVideoMeta(fileId: string): Promise<VideoMeta | null> {
  const folderId = await allSongsFolderId();
  if (!folderId) return null;
  const accessToken = await getAccessTokenFromRefreshToken();
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=name,size,md5Checksum,mimeType,parents,trashed&supportsAllDrives=true`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`drive_meta_failed_${res.status}`);
  const m = (await res.json()) as {
    name?: string;
    size?: string;
    md5Checksum?: string;
    mimeType?: string;
    parents?: string[];
    trashed?: boolean;
  };
  if (m.trashed || !m.parents?.includes(folderId) || !m.mimeType?.startsWith("video/")) return null;
  if (!m.size || !m.md5Checksum) return null;
  return { size: Number(m.size), md5: m.md5Checksum, mimeType: m.mimeType, name: m.name ?? "Untitled" };
}

export async function fetchVideoRange(fileId: string, start: number, endInclusive: number): Promise<Buffer> {
  const accessToken = await getAccessTokenFromRefreshToken();
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`,
    { headers: { Authorization: `Bearer ${accessToken}`, Range: `bytes=${start}-${endInclusive}` } }
  );
  if (res.status !== 206 && res.status !== 200) throw new Error(`drive_range_failed_${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const expected = endInclusive - start + 1;
  if (buf.length !== expected) throw new Error(`drive_range_short_${buf.length}_of_${expected}`);
  return buf;
}
