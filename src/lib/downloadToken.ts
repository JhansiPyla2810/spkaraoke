import crypto from "node:crypto";
import { downloadTokenSecret } from "@/lib/offlineKeys";

// Short-lived pass handed out by /api/app/downloads/authorize, required on
// every segment request. Bound to one asset and one device, so it can't be
// reused for another song or passed to another machine.
const TTL_MS = 30 * 60 * 1000;

type Payload = { assetId: string; deviceId: string; exp: number };

function sign(body: string) {
  return crypto.createHmac("sha256", downloadTokenSecret()).update(body).digest("base64url");
}

export function issueDownloadToken(assetId: string, deviceId: string): string {
  const body = Buffer.from(JSON.stringify({ assetId, deviceId, exp: Date.now() + TTL_MS })).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verifyDownloadToken(token: string): Payload | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Payload;
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
