import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { offlineDownloads } from "@/lib/schema";
import { requireAppDevice } from "@/lib/appDevice";
import { verifyDownloadToken } from "@/lib/downloadToken";
import { fetchVideoRange, getCatalogVideoMeta } from "@/lib/driveSource";
import { decryptContentKeyAtRest } from "@/lib/offlineKeys";
import { encryptChunk } from "@/lib/chunkCrypto";

export const maxDuration = 60;

// Delivers one chunk of a download, encrypted on the fly from the live
// Drive file. Re-checks subscription + device on every request and
// requires the download token from /authorize (bound to this download and
// device). Also re-checks the source: if the video was deleted from the
// catalog or replaced in Drive, this download stops here.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ downloadId: string; index: string }> }
) {
  const gate = await requireAppDevice(request);
  if (!gate.ok) return gate.response;

  const { downloadId, index } = await params;
  const dt = request.nextUrl.searchParams.get("dt");
  const token = dt ? verifyDownloadToken(dt) : null;
  if (!token || token.assetId !== downloadId || token.deviceId !== gate.deviceId) {
    return NextResponse.json({ ok: false, error: "invalid_download_token" }, { status: 401 });
  }

  const [row] = await db.select().from(offlineDownloads).where(eq(offlineDownloads.downloadId, downloadId));
  if (!row || row.deviceId !== gate.deviceId) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  if (row.status !== "active") {
    return NextResponse.json({ ok: false, error: `download_${row.status}` }, { status: 410 });
  }

  const chunkIndex = Number(index);
  if (!Number.isInteger(chunkIndex) || chunkIndex < 0 || chunkIndex >= row.chunkCount) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  try {
    const meta = await getCatalogVideoMeta(row.videoId);
    if (!meta) {
      await db.update(offlineDownloads).set({ status: "revoked" }).where(eq(offlineDownloads.id, row.id));
      return NextResponse.json({ ok: false, error: "source_removed" }, { status: 410 });
    }
    if (meta.md5 !== row.sourceMd5) {
      await db.update(offlineDownloads).set({ status: "superseded" }).where(eq(offlineDownloads.id, row.id));
      return NextResponse.json({ ok: false, error: "source_changed" }, { status: 410 });
    }

    const start = chunkIndex * row.chunkSize;
    const end = Math.min(row.size, start + row.chunkSize) - 1;
    const plaintext = await fetchVideoRange(row.videoId, start, end);
    const key = decryptContentKeyAtRest(row.encryptedContentKey, row.downloadId);
    const blob = encryptChunk(key, plaintext, { downloadId, chunkIndex, chunkCount: row.chunkCount });

    return new NextResponse(new Uint8Array(blob), {
      status: 200,
      headers: {
        "content-type": "application/octet-stream",
        "content-length": String(blob.length),
        "cache-control": "private, no-store",
      },
    });
  } catch (e) {
    console.error("chunk delivery failed", e);
    return NextResponse.json({ ok: false, error: "chunk_unavailable" }, { status: 502 });
  }
}
