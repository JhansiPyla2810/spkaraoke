import fs from "node:fs/promises";
import path from "node:path";
import { getAccessTokenFromRefreshToken } from "@/lib/googleAuth";

export type ManifestSegment = {
  segmentIndex: number;
  file: string;
  size: number;
  sha256: string;
  nonce: string;
  tag: string;
  // Present for 'drive' storage: the encrypted segment's own Drive file ID.
  driveFileId?: string;
};

export type ManifestTrack = { track: string; mime: string; segments: ManifestSegment[] };

export type Manifest = {
  formatVersion: number;
  assetId: string;
  assetVersion: number;
  tracks: ManifestTrack[];
};

// What the app is allowed to see: everything it needs to download, verify
// and later decrypt (with a separately-issued wrapped key), minus where the
// bytes actually live on our side.
export function publicManifest(m: Manifest): Manifest {
  return {
    ...m,
    tracks: m.tracks.map((t) => ({
      ...t,
      segments: t.segments.map((s) => {
        const copy = { ...s };
        delete copy.driveFileId;
        return copy;
      }),
    })),
  };
}

export async function readEncryptedSegment(
  storage: string,
  storageRef: string,
  segment: ManifestSegment
): Promise<Buffer> {
  if (storage === "local") {
    // Dev/testing only - production never serves from the server's disk.
    if (process.env.NODE_ENV === "production") throw new Error("local_storage_disabled_in_production");
    const base = path.resolve(storageRef);
    const full = path.resolve(base, segment.file);
    if (!full.startsWith(base + path.sep)) throw new Error("invalid_segment_path");
    return fs.readFile(full);
  }

  if (storage === "drive") {
    if (!segment.driveFileId) throw new Error("segment_missing_drive_id");
    const accessToken = await getAccessTokenFromRefreshToken();
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${segment.driveFileId}?alt=media&supportsAllDrives=true`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) throw new Error(`drive_fetch_failed_${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }

  throw new Error(`unknown_storage_${storage}`);
}
