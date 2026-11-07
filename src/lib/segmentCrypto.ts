import crypto from "node:crypto";

// Must stay byte-for-byte compatible with offline-poc/segmentCrypto.js in
// the spkaraoke-electron-app repo, which decrypts what this encrypts.
export const SEGMENT_FORMAT_VERSION = 1;

export type SegmentContext = { assetId: string; assetVersion: number; track: string; segmentIndex: number };

function buildAad({ assetId, assetVersion, track, segmentIndex }: SegmentContext) {
  return Buffer.from(`spk|v${SEGMENT_FORMAT_VERSION}|${assetId}|${assetVersion}|${track}|${segmentIndex}`, "utf8");
}

export function encryptSegment(key: Buffer, plaintext: Buffer, context: SegmentContext) {
  const nonce = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, nonce);
  cipher.setAAD(buildAad(context));
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return { nonce, ciphertext, tag: cipher.getAuthTag() };
}
