import crypto from "node:crypto";

// Content keys are stored in the DB encrypted under a server-only master
// key (OFFLINE_KEK, 32 bytes hex), so a leaked DB dump alone can't decrypt
// any downloaded media. They're only ever decrypted in memory to be
// re-wrapped for a specific registered device.
function masterKey(): Buffer {
  const hex = process.env.OFFLINE_KEK;
  if (!hex || hex.length !== 64) throw new Error("OFFLINE_KEK env var must be 32 bytes of hex");
  return Buffer.from(hex, "hex");
}

// Separate derived key for signing download tokens, so the content-key
// master key is never used directly as an HMAC secret.
export function downloadTokenSecret(): Buffer {
  return Buffer.from(crypto.hkdfSync("sha256", masterKey(), Buffer.alloc(0), "spk-download-token-v1", 32));
}

function aad(assetId: string, assetVersion: number) {
  return Buffer.from(`spk-key-at-rest|v1|${assetId}|${assetVersion}`, "utf8");
}

export function encryptContentKeyAtRest(contentKey: Buffer, assetId: string, assetVersion: number): string {
  const nonce = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", masterKey(), nonce);
  cipher.setAAD(aad(assetId, assetVersion));
  const ct = Buffer.concat([cipher.update(contentKey), cipher.final()]);
  return JSON.stringify({
    nonce: nonce.toString("base64"),
    ct: ct.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
  });
}

export function decryptContentKeyAtRest(stored: string, assetId: string, assetVersion: number): Buffer {
  const { nonce, ct, tag } = JSON.parse(stored);
  const decipher = crypto.createDecipheriv("aes-256-gcm", masterKey(), Buffer.from(nonce, "base64"));
  decipher.setAAD(aad(assetId, assetVersion));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(ct, "base64")), decipher.final()]);
}
