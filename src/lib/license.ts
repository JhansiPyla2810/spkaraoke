import crypto from "node:crypto";
import { decryptContentKeyAtRest, licenseSigningKey } from "@/lib/offlineKeys";
import { wrapContentKey, type WrappedKey } from "@/lib/keyWrap";
import type { offlineDownloads } from "@/lib/schema";

// Offline license: the server's signed permission for one device to play
// one downloaded video until expiresAt. The app verifies the signature
// with a public key embedded in it, so a license can't be forged, edited
// (e.g. extending expiresAt) or moved to another device.
export const LICENSE_VERSION = 1;

export type LicensePayload = {
  v: number;
  licenseId: string;
  downloadId: string;
  subscriberId: number;
  deviceId: string;
  videoId: string;
  size: number;
  chunkSize: number;
  chunkCount: number;
  issuedAt: number;
  expiresAt: number;
  offlinePlayback: boolean;
  wrappedContentKey: WrappedKey;
};

// The exact signed bytes travel as an opaque base64url string, so the app
// never has to re-serialize JSON identically to check the signature.
export type SignedLicense = { payload: string; signature: string };

export function signLicense(payload: LicensePayload): SignedLicense {
  const bytes = Buffer.from(JSON.stringify(payload), "utf8");
  const signature = crypto.sign(null, bytes, licenseSigningKey());
  return { payload: bytes.toString("base64url"), signature: signature.toString("base64url") };
}

// Issues (or re-issues on renewal) the license for one download: re-wraps
// that download's content key to the device's registered public key and
// sets expiry to the subscription's end - the agreed policy is "playable
// offline until the subscription expires"; any online check before then
// still applies revocation immediately.
export function issueLicenseForDownload(
  row: typeof offlineDownloads.$inferSelect,
  devicePublicKeyBase64: string,
  subscriptionExpiresAt: number
): SignedLicense {
  const contentKey = decryptContentKeyAtRest(row.encryptedContentKey, row.downloadId);
  const wrappedContentKey = wrapContentKey(contentKey, Buffer.from(devicePublicKeyBase64, "base64"), {
    deviceId: row.deviceId,
    assetId: row.downloadId,
    assetVersion: 1,
  });
  return signLicense({
    v: LICENSE_VERSION,
    licenseId: crypto.randomUUID(),
    downloadId: row.downloadId,
    subscriberId: row.subscriberId,
    deviceId: row.deviceId,
    videoId: row.videoId,
    size: row.size,
    chunkSize: row.chunkSize,
    chunkCount: row.chunkCount,
    issuedAt: Date.now(),
    expiresAt: subscriptionExpiresAt,
    offlinePlayback: true,
    wrappedContentKey,
  });
}
