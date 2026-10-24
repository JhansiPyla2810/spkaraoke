"use server";

import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { accessGrants } from "@/lib/schema";
import {
  adminCookieName,
  deviceCookieName,
  generateSessionId,
  getSessionStatus,
  isAdminEmail,
  type SessionStatus,
} from "@/lib/deviceSession";
import { logAccessView } from "@/lib/accessViews";
import { verifyGoogleIdToken } from "@/lib/googleSignIn";

// Read-only: figures out where this tab/device stands relative to whoever
// currently holds the link, without changing anything. An admin browser
// (proven via a prior verified sign-in, see claimSession below) always
// reads as "match" — admins can view in parallel with whichever client
// currently holds the link, independent of the single-session lock.
export async function checkSession(
  token: string,
  requestTabId: string,
  tabIdWasAlreadyStored: boolean
): Promise<SessionStatus> {
  const store = await cookies();
  if (store.get(adminCookieName(token))?.value === "1") return "match";

  const [grant] = await db.select().from(accessGrants).where(eq(accessGrants.token, token));
  if (!grant) return "unclaimed";

  const cookieDeviceId = store.get(deviceCookieName(token))?.value;

  return getSessionStatus(
    grant.activeDeviceId,
    grant.activeTabId,
    cookieDeviceId,
    requestTabId,
    tabIdWasAlreadyStored
  );
}

// Used for the very first claim of a link, and for an explicit takeover
// (same device new tab, or a different device entirely) — same operation
// either way: this tab becomes the one allowed to use the link. Requires a
// verified Google sign-in whose email matches the grant's clientEmail, so
// having just the link isn't enough to take over someone else's session —
// only the exact Google account the admin generated the link for can claim
// it. Only counted as a "view" here — plain refreshes of an
// already-matching tab never call this, so the views count reflects
// transfers, not reloads.
//
// An account listed in ADMIN_EMAILS takes a separate path: it marks this
// browser as an admin viewer and returns immediately, without touching the
// grant's activeDeviceId/activeTabId or logging a view - so it never
// bumps the client's own session, and can watch in parallel with them.
export async function claimSession(
  token: string,
  requestTabId: string,
  googleCredential: string
): Promise<{ ok: true } | { ok: false; error: "wrong_account" | "not_found" }> {
  const [grant] = await db.select().from(accessGrants).where(eq(accessGrants.token, token));
  if (!grant) return { ok: false, error: "not_found" };

  const signedInEmail = await verifyGoogleIdToken(googleCredential);
  if (!signedInEmail) return { ok: false, error: "wrong_account" };

  const store = await cookies();

  if (isAdminEmail(signedInEmail)) {
    store.set(adminCookieName(token), "1", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return { ok: true };
  }

  if (signedInEmail !== grant.clientEmail.toLowerCase()) {
    return { ok: false, error: "wrong_account" };
  }

  let deviceId = store.get(deviceCookieName(token))?.value;
  if (!deviceId) {
    deviceId = generateSessionId();
    store.set(deviceCookieName(token), deviceId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  await db
    .update(accessGrants)
    .set({ activeDeviceId: deviceId, activeTabId: requestTabId })
    .where(eq(accessGrants.id, grant.id));

  try {
    await logAccessView(grant.id);
  } catch (e) {
    console.error("Failed to log access view", e);
  }

  return { ok: true };
}
