import crypto from "node:crypto";

// Locks a content key to one registered app device. The server wraps; only
// the device holding the matching private key can unwrap. Must stay
// byte-for-byte compatible with keyWrap.js in the spkaraoke-electron-app
// repo.
//
// Scheme: ephemeral X25519 ECDH with the device's public key -> HKDF-SHA256
// -> AES-256-GCM over the 32-byte content key. The device ID and asset
// identity go into both the HKDF info and the GCM AAD, so a wrapped key
// issued for one device/asset can't be replayed for another.
export const WRAP_VERSION = 1;

export type WrapContext = { deviceId: string; assetId: string; assetVersion: number };

export type WrappedKey = { v: number; eph: string; nonce: string; ct: string; tag: string };

function wrapInfo({ deviceId, assetId, assetVersion }: WrapContext): Buffer {
  return Buffer.from(`spk-keywrap|v${WRAP_VERSION}|${deviceId}|${assetId}|${assetVersion}`, "utf8");
}

export function wrapContentKey(contentKey: Buffer, devicePublicKeyDer: Buffer, context: WrapContext): WrappedKey {
  const devicePublic = crypto.createPublicKey({ key: devicePublicKeyDer, format: "der", type: "spki" });
  const eph = crypto.generateKeyPairSync("x25519");
  const shared = crypto.diffieHellman({ privateKey: eph.privateKey, publicKey: devicePublic });
  const ephPublicDer = eph.publicKey.export({ type: "spki", format: "der" });
  const info = wrapInfo(context);
  const kek = Buffer.from(crypto.hkdfSync("sha256", shared, ephPublicDer, info, 32));

  const nonce = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", kek, nonce);
  cipher.setAAD(info);
  const ciphertext = Buffer.concat([cipher.update(contentKey), cipher.final()]);
  return {
    v: WRAP_VERSION,
    eph: ephPublicDer.toString("base64"),
    nonce: nonce.toString("base64"),
    ct: ciphertext.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
  };
}

// Validates a public key the app sent at registration: must parse as an
// X25519 SPKI key, so junk can't be stored and later fail at wrap time.
export function isValidDevicePublicKey(publicKeyDer: Buffer): boolean {
  try {
    const key = crypto.createPublicKey({ key: publicKeyDer, format: "der", type: "spki" });
    return key.asymmetricKeyType === "x25519";
  } catch {
    return false;
  }
}
