// Media worker: prepares one video for offline download. Packages it into
// fMP4 segments with FFmpeg, encrypts each segment under a fresh content
// key, records size + SHA-256 per encrypted segment, stores the segments,
// and registers the asset (key encrypted at rest under OFFLINE_KEK).
//
// Runs locally (needs ffmpeg) - never on Vercel.
//   npx tsx --env-file=.env.local scripts/offline-prepare-asset.ts \
//     --source path/to/video.mp4 --video-id <catalog video id>
//
// Storage is local-disk only for now (dev/testing); Drive storage for the
// real catalog comes with catalog processing.
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import { offlineAssets } from "../src/lib/schema";
import { encryptSegment, SEGMENT_FORMAT_VERSION } from "../src/lib/segmentCrypto";
import { encryptContentKeyAtRest } from "../src/lib/offlineKeys";
import type { Manifest, ManifestTrack } from "../src/lib/offlineStorage";

function arg(name: string): string {
  const i = process.argv.indexOf(`--${name}`);
  const v = i >= 0 ? process.argv[i + 1] : undefined;
  if (!v) throw new Error(`missing --${name}`);
  return v;
}

const source = path.resolve(arg("source"));
const videoId = arg("video-id");
if (!fs.existsSync(source)) throw new Error(`source not found: ${source}`);

async function main() {
  const [latest] = await db
    .select()
    .from(offlineAssets)
    .where(and(eq(offlineAssets.videoId, videoId)))
    .orderBy(desc(offlineAssets.assetVersion))
    .limit(1);
  const assetVersion = (latest?.assetVersion ?? 0) + 1;
  const assetId = `oa_${videoId}_v${assetVersion}`;

  // 1. Package into fMP4 (DASH) segments.
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "spk-prep-"));
  execFileSync(
    "ffmpeg",
    ["-y", "-loglevel", "error", "-i", source, "-map", "0:v:0", "-map", "0:a:0", "-c", "copy",
     "-f", "dash", "-seg_duration", "4", "-use_template", "1", "-use_timeline", "1",
     path.join(work, "manifest.mpd")],
    { stdio: "inherit" }
  );

  // The MPD already carries the exact codec strings MSE needs.
  const mpd = fs.readFileSync(path.join(work, "manifest.mpd"), "utf8");
  const codecsFor = (streamIdx: number) => {
    const m = mpd.match(new RegExp(`<Representation id="${streamIdx}"[^>]*codecs="([^"]+)"`));
    if (!m) throw new Error(`no codecs for stream ${streamIdx} in MPD`);
    return m[1];
  };

  const files = fs.readdirSync(work);
  const trackSpec = [
    { track: "video", stream: 0, mime: `video/mp4; codecs="${codecsFor(0)}"` },
    { track: "audio", stream: 1, mime: `audio/mp4; codecs="${codecsFor(1)}"` },
  ];

  // 2. Encrypt every segment (init first, then chunks in order).
  const contentKey = crypto.randomBytes(32);
  const storageRef = path.resolve(".offline-assets", assetId);
  fs.mkdirSync(storageRef, { recursive: true });

  const tracks: ManifestTrack[] = trackSpec.map(({ track, stream, mime }) => {
    const chunks = files.filter((f) => f.startsWith(`chunk-stream${stream}-`)).sort();
    const ordered = [`init-stream${stream}.m4s`, ...chunks];
    const segments = ordered.map((file, segmentIndex) => {
      const plaintext = fs.readFileSync(path.join(work, file));
      const { nonce, ciphertext, tag } = encryptSegment(contentKey, plaintext, {
        assetId,
        assetVersion,
        track,
        segmentIndex,
      });
      const outName = `${track}-${String(segmentIndex).padStart(5, "0")}.enc`;
      fs.writeFileSync(path.join(storageRef, outName), ciphertext);
      return {
        segmentIndex,
        file: outName,
        size: ciphertext.length,
        sha256: crypto.createHash("sha256").update(ciphertext).digest("hex"),
        nonce: nonce.toString("base64"),
        tag: tag.toString("base64"),
      };
    });
    return { track, mime, segments };
  });

  const manifest: Manifest = { formatVersion: SEGMENT_FORMAT_VERSION, assetId, assetVersion, tracks };

  // 3. Register. The key leaves memory only encrypted under OFFLINE_KEK.
  await db.insert(offlineAssets).values({
    videoId,
    assetId,
    assetVersion,
    encryptedContentKey: encryptContentKeyAtRest(contentKey, assetId, assetVersion),
    manifest: JSON.stringify(manifest),
    storage: "local",
    storageRef,
    status: "ready",
    createdAt: Date.now(),
  });

  fs.rmSync(work, { recursive: true, force: true });
  const count = tracks.reduce((n, t) => n + t.segments.length, 0);
  console.log(`Prepared ${assetId}: ${count} encrypted segments -> ${storageRef}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
