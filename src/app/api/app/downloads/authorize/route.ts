import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { offlineAssets } from "@/lib/schema";
import { requireAppDevice } from "@/lib/appDevice";
import { issueDownloadToken } from "@/lib/downloadToken";
import { publicManifest, type Manifest } from "@/lib/offlineStorage";

// Step one of a download: confirms subscription + device, picks the latest
// ready prepared version of the requested song, and returns its manifest
// (sizes, checksums, nonces/tags - no key, no storage locations) plus a
// short-lived download token for fetching its encrypted segments.
export async function POST(request: NextRequest) {
  const gate = await requireAppDevice(request);
  if (!gate.ok) return gate.response;

  let body: { videoId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
  if (!body.videoId) return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });

  const [asset] = await db
    .select()
    .from(offlineAssets)
    .where(and(eq(offlineAssets.videoId, body.videoId), eq(offlineAssets.status, "ready")))
    .orderBy(desc(offlineAssets.assetVersion))
    .limit(1);
  if (!asset) return NextResponse.json({ ok: false, error: "not_available_offline" }, { status: 404 });

  const manifest = JSON.parse(asset.manifest) as Manifest;
  return NextResponse.json({
    ok: true,
    assetId: asset.assetId,
    assetVersion: asset.assetVersion,
    manifest: publicManifest(manifest),
    downloadToken: issueDownloadToken(asset.assetId, gate.deviceId),
  });
}
