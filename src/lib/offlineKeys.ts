import crypto from "node:crypto";

// Everything secret about offline downloads derives from ONE server-only
// value, OFFLINE_KEK (32 bytes hex). It must be identical wherever the
// server runs (Vercel + any local dev talking to the same DB), must be
// backed up, and must never change - losing or changing it makes every
// issued download unplayable at its next license renewal.
function masterKey(): Buffer {
  const hex = process.env.OFFLINE_KEK;
  if (!hex || hex.length !== 64) throw new Error("OFFLINE_KEK env var must be 32 bytes of hex");
  return Buffer.from(hex, "hex");
}

function derive(info: string): Buffer {
  return Buffer.from(crypto.hkdfSync("sha256", masterKey(), Buffer.alloc(0), info, 32));
}

// Separate derived keys so the master key is never used directly.
export function downloadTokenSecret(): Buffer {
  return derive("spk-download-token-v1");
}

// Ed25519 license-signing key, derived deterministically so there's no
// second secret to manage. The matching public key is embedded in the
// desktop app (see licenseSigningPublicKeyBase64 / the app's license.js).
const ED25519_PKCS8_PREFIX = Buffer.from("302e020100300506032b657004220420", "hex");

export function licenseSigningKey(): crypto.KeyObject {
  const seed = derive("spk-license-signing-v1");
  return crypto.createPrivateKey({ key: Buffer.concat([ED25519_PKCS8_PREFIX, seed]), format: "der", type: "pkcs8" });
}

export function licenseSigningPublicKeyBase64(): string {
  return crypto
    .createPublicKey(licenseSigningKey())
    .export({ type: "spki", format: "der" })
    .toString("base64");
}

// Per-download content keys are stored encrypted under the master key, so
// a leaked DB dump alone can't decrypt anyone's downloads. They're only
// ever decrypted in memory to encrypt chunks or re-wrap for a license.
function aad(downloadId: string) {
  return Buffer.from(`spk-key-at-rest|v2|${downloadId}`, "utf8");
}

export function encryptContentKeyAtRest(contentKey: Buffer, downloadId: string): string {
  const nonce = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", masterKey(), nonce);
  cipher.setAAD(aad(downloadId));
  const ct = Buffer.concat([cipher.update(contentKey), cipher.final()]);
  return JSON.stringify({
    nonce: nonce.toString("base64"),
    ct: ct.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
  });
}

export function decryptContentKeyAtRest(stored: string, downloadId: string): Buffer {
  const { nonce, ct, tag } = JSON.parse(stored);
  const decipher = crypto.createDecipheriv("aes-256-gcm", masterKey(), Buffer.from(nonce, "base64"));
  decipher.setAAD(aad(downloadId));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(ct, "base64")), decipher.final()]);
}
