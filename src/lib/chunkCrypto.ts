import crypto from "node:crypto";

// Encrypts one chunk of a downloaded video on the fly. Output is a
// self-contained blob: nonce (12) | ciphertext | GCM tag (16). The download
// ID, chunk index and total chunk count are authenticated, so a chunk
// can't be reordered, dropped from the end, or moved into another download.
// Must stay compatible with chunkCrypto.js in the desktop app.
export const CHUNK_FORMAT_VERSION = 1;

export type ChunkContext = { downloadId: string; chunkIndex: number; chunkCount: number };

export function chunkAad({ downloadId, chunkIndex, chunkCount }: ChunkContext): Buffer {
  return Buffer.from(`spk-chunk|v${CHUNK_FORMAT_VERSION}|${downloadId}|${chunkIndex}|${chunkCount}`, "utf8");
}

export function encryptChunk(key: Buffer, plaintext: Buffer, context: ChunkContext): Buffer {
  const nonce = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, nonce);
  cipher.setAAD(chunkAad(context));
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return Buffer.concat([nonce, ciphertext, cipher.getAuthTag()]);
}
