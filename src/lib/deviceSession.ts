import crypto from "node:crypto";

export function deviceCookieName(token: string): string {
  return `wd_${token}`;
}

export function generateDeviceId(): string {
  return crypto.randomBytes(16).toString("hex");
}

// Grants to these emails (your own test links) are exempt from the
// single-device lock entirely, since you routinely open your own test
// links from several devices.
export function isDeviceLockExempt(clientEmail: string): boolean {
  const exempt = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return exempt.includes(clientEmail.toLowerCase());
}

export type DeviceStatus = "exempt" | "unclaimed" | "match" | "foreign-new" | "kicked";

// - "exempt": this grant's email is a test/admin email — no restriction.
// - "unclaimed": nobody has opened this link on any device yet.
// - "match": this is the device already holding the link.
// - "foreign-new": a different device never seen before, AND someone else
//   currently holds the link — offer a takeover.
// - "kicked": this device used to hold the link but has since been
//   superseded by a later takeover — locked out, no retry.
export function getDeviceStatus(
  clientEmail: string,
  activeDeviceId: string | null,
  cookieDeviceId: string | undefined
): DeviceStatus {
  if (isDeviceLockExempt(clientEmail)) return "exempt";
  if (!activeDeviceId) return "unclaimed";
  if (cookieDeviceId && cookieDeviceId === activeDeviceId) return "match";
  if (!cookieDeviceId) return "foreign-new";
  return "kicked";
}
