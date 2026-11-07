import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { offlineAssets } from "@/lib/schema";
import { requireAppDevice } from "@/lib/appDevice";
import { verifyDownloadToken } from "@/lib/downloadToken";
import { readEncryptedSegment, type Manifest } from "@/lib/offlineStorage";

export const maxDuration = 60;

// Delivers one encrypted segment. Requires both a live subscription
// session (re-checked on every request, so a revoke mid-download stops it)
// AND the download token from /authorize, bound to this asset and this
// device. Bytes are already encrypted - useless without the device-wrapped
// content key, which is only ever issued with a license (M5).
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assetId: string; track: string; index: string }> }
) {
  const gate = await requireAppDevice(request);
  if (!gate.ok) return gate.response;

  const { assetId, track, index } = await params;
  const dt = request.nextUrl.searchParams.get("dt");
  const token = dt ? verifyDownloadToken(dt) : null;
  if (!token || token.assetId !== assetId || token.deviceId !== gate.deviceId) {
    return NextResponse.json({ ok: false, error: "invalid_download_token" }, { status: 401 });
  }

  const [asset] = await db.select().from(offlineAssets).where(eq(offlineAssets.assetId, assetId));
  if (!asset || asset.status !== "ready") {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const manifest = JSON.parse(asset.manifest) as Manifest;
  const segment = manifest.tracks
    .find((t) => t.track === track)
    ?.segments.find((s) => s.segmentIndex === Number(index));
  if (!segment) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  try {
    const bytes = await readEncryptedSegment(asset.storage, asset.storageRef, segment);
    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "content-type": "application/octet-stream",
        "content-length": String(bytes.length),
        "cache-control": "private, no-store",
      },
    });
  } catch (e) {
    console.error("segment read failed", e);
    return NextResponse.json({ ok: false, error: "segment_unavailable" }, { status: 502 });
  }
}
