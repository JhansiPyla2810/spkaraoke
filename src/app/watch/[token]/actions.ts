"use server";

import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { accessGrants } from "@/lib/schema";
import { deviceCookieName, generateSessionId, getSessionStatus, type SessionStatus } from "@/lib/deviceSession";
import { logAccessView } from "@/lib/accessViews";
import { verifyGoogleIdToken } from "@/lib/googleSignIn";

// Read-only: figures out where this tab/device stands relative to whoever
// currently holds the link, without changing anything.
export async function checkSession(
  token: string,
  requestTabId: string,
  tabIdWasAlreadyStored: boolean
): Promise<SessionStatus> {
  const [grant] = await db.select().from(accessGrants).where(eq(accessGrants.token, token));
  if (!grant) return "unclaimed";

  const store = await cookies();
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
export async function claimSession(
  token: string,
  requestTabId: string,
  googleCredential: string
): Promise<{ ok: true } | { ok: false; error: "wrong_account" | "not_found" }> {
  const [grant] = await db.select().from(accessGrants).where(eq(accessGrants.token, token));
  if (!grant) return { ok: false, error: "not_found" };

  const signedInEmail = await verifyGoogleIdToken(googleCredential);
  if (!signedInEmail || signedInEmail !== grant.clientEmail.toLowerCase()) {
    return { ok: false, error: "wrong_account" };
  }

  const store = await cookies();
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
