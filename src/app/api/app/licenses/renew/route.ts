import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { offlineDownloads } from "@/lib/schema";
import { requireAppDevice } from "@/lib/appDevice";
import { getCatalogVideoMeta } from "@/lib/driveSource";
import { issueLicenseForDownload } from "@/lib/license";

// The app's online re-check for its offline downloads, called whenever it
// has internet. If the subscription/session/device is no longer valid,
// requireAppDevice rejects the whole call and the app blocks playback. If
// valid, each download gets a fresh license (expiry = subscription end):
// - "ok": still in the catalog, unchanged.
// - "update_available": replaced in Drive - the old copy keeps playing,
//   the app can offer to re-download.
// - "revoked": deleted from the catalog (or not this device's download) -
//   no license; the app removes it.
const MAX_IDS = 500;
const CONCURRENCY = 5; // gentle on Drive's per-user rate limit

type Result =
  | { downloadId: string; status: "ok" | "update_available"; license: ReturnType<typeof issueLicenseForDownload> }
  | { downloadId: string; status: "revoked" };

export async function POST(request: NextRequest) {
  const check = await requireAppDevice(request);
  if (!check.ok) return check.response;
  const gate = check;

  let body: { downloadIds?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
  const ids = Array.isArray(body.downloadIds)
    ? [...new Set(body.downloadIds.filter((x): x is string => typeof x === "string"))].slice(0, MAX_IDS)
    : [];
  if (ids.length === 0) return NextResponse.json({ ok: true, results: [], serverTime: Date.now() });

  const rows = await db
    .select()
    .from(offlineDownloads)
    .where(and(inArray(offlineDownloads.downloadId, ids), eq(offlineDownloads.deviceId, gate.deviceId)));
  const byId = new Map(rows.map((r) => [r.downloadId, r]));

  const results: Result[] = [];
  let next = 0;
  async function worker() {
    while (next < ids.length) {
      const downloadId = ids[next++];
      const row = byId.get(downloadId);
      if (!row || row.status === "revoked" || row.subscriberId !== gate.subscriberId) {
        results.push({ downloadId, status: "revoked" });
        continue;
      }
      try {
        const meta = await getCatalogVideoMeta(row.videoId);
        if (!meta) {
          await db.update(offlineDownloads).set({ status: "revoked" }).where(eq(offlineDownloads.id, row.id));
          results.push({ downloadId, status: "revoked" });
          continue;
        }
        const license = issueLicenseForDownload(row, gate.devicePublicKey, gate.subscriptionExpiresAt, {
          subscriberLabel: gate.subscriberLabel,
          title: meta.name,
          mimeType: meta.mimeType,
        });
        results.push({ downloadId, status: meta.md5 === row.sourceMd5 ? "ok" : "update_available", license });
      } catch (e) {
        // Drive hiccup: skip this one (the app keeps its current license
        // and retries on the next check) rather than wrongly revoking.
        console.error("renew: drive check failed for", downloadId, e);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, ids.length) }, worker));

  return NextResponse.json({ ok: true, results, serverTime: Date.now() });
}
