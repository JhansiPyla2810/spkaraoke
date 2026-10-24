import crypto from "node:crypto";

export function deviceCookieName(token: string): string {
  return `wd_${token}`;
}

// Separate from the client device cookie: marks this browser as having
// proven (via verified Google sign-in) that it belongs to one of the
// business's own admin accounts. Admins can view a link in parallel with
// whichever client currently holds it — this cookie's presence is checked
// before the normal single-session logic even runs, and claiming it never
// touches the grant's activeDeviceId/activeTabId, so it never kicks the
// real client out.
export function adminCookieName(token: string): string {
  return `wa_${token}`;
}

export function isAdminEmail(email: string): boolean {
  const admins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes(email.toLowerCase());
}

export function generateSessionId(): string {
  return crypto.randomBytes(16).toString("hex");
}

export type SessionStatus =
  | "unclaimed" // nobody has ever opened this link
  | "match" // this exact tab, on this exact device, already holds it
  | "device-new" // a device that's never held this link, while another device currently does
  | "device-kicked" // this device held it before, but another device has since taken over
  | "tab-new" // a new tab on the *same, currently-active* device
  | "tab-kicked"; // this exact tab held it before, but another tab (same device) took over

// No admin exemption here deliberately — every grant, including the
// account owner's own test links, goes through the same single-session
// enforcement so it's actually tested the way a real client would hit it.
export function getSessionStatus(
  activeDeviceId: string | null,
  activeTabId: string | null,
  cookieDeviceId: string | undefined,
  requestTabId: string,
  tabIdWasAlreadyStored: boolean
): SessionStatus {
  if (!activeDeviceId) return "unclaimed";

  if (!cookieDeviceId) return "device-new";
  if (cookieDeviceId !== activeDeviceId) return "device-kicked";

  // Same device as the one currently holding the link — now check the tab.
  if (requestTabId === activeTabId) return "match";
  if (!tabIdWasAlreadyStored) return "tab-new";
  return "tab-kicked";
}
