import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { offlineDownloads } from "@/lib/schema";
import { requireAppDevice } from "@/lib/appDevice";
import { issueDownloadToken } from "@/lib/downloadToken";
import { getCatalogVideoMeta } from "@/lib/driveSource";
import { encryptContentKeyAtRest } from "@/lib/offlineKeys";
import { issueLicenseForDownload } from "@/lib/license";

const CHUNK_SIZE = 8 * 1024 * 1024;

// Starts (or resumes) an offline download of one catalog video for this
// device. Returns a signed license (content key wrapped to this device,
// valid until the subscription ends) plus a short-lived download token for
// fetching its encrypted chunks.
//
// Idempotent per (device, video): if this device already has an active
// download of the same unchanged video, the same download (same key) is
// returned so an interrupted download can resume. If the video in Drive
// has since been replaced, a fresh download with a new key is created.
export async function POST(request: NextRequest) {
  const gate = await requireAppDevice(request);
  if (!gate.ok) return gate.response;

  let body: { videoId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
  const videoId = body.videoId;
  if (!videoId) return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });

  let meta;
  try {
    meta = await getCatalogVideoMeta(videoId);
  } catch (e) {
    console.error("drive meta failed", e);
    return NextResponse.json({ ok: false, error: "drive_unavailable" }, { status: 502 });
  }
  if (!meta) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  const [existing] = await db
    .select()
    .from(offlineDownloads)
    .where(
      and(
        eq(offlineDownloads.deviceId, gate.deviceId),
        eq(offlineDownloads.videoId, videoId),
        eq(offlineDownloads.status, "active")
      )
    );

  let row = existing;
  if (!row || row.sourceMd5 !== meta.md5 || row.subscriberId !== gate.subscriberId) {
    if (row) {
      await db.update(offlineDownloads).set({ status: "superseded" }).where(eq(offlineDownloads.id, row.id));
    }
    const downloadId = `dl_${crypto.randomBytes(16).toString("hex")}`;
    const contentKey = crypto.randomBytes(32);
    [row] = await db
      .insert(offlineDownloads)
      .values({
        downloadId,
        subscriberId: gate.subscriberId,
        deviceId: gate.deviceId,
        videoId,
        sourceMd5: meta.md5,
        size: meta.size,
        chunkSize: CHUNK_SIZE,
        chunkCount: Math.max(1, Math.ceil(meta.size / CHUNK_SIZE)),
        encryptedContentKey: encryptContentKeyAtRest(contentKey, downloadId),
        status: "active",
        createdAt: Date.now(),
      })
      .returning();
  }

  return NextResponse.json({
    ok: true,
    downloadId: row.downloadId,
    mimeType: meta.mimeType,
    license: issueLicenseForDownload(row, gate.devicePublicKey, gate.subscriptionExpiresAt, {
      subscriberLabel: gate.subscriberLabel,
      title: meta.name,
      mimeType: meta.mimeType,
    }),
    downloadToken: issueDownloadToken(row.downloadId, gate.deviceId),
  });
}
