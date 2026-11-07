"use server";

import { db } from "@/lib/db";
import { subscribers } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { verifyGoogleIdToken } from "@/lib/googleSignIn";
import { getSubscriptionStatus } from "@/lib/subscriptions";
import { startAppSession } from "@/lib/appAuth";

// Same checks as /api/app/auth (verify the Google token ourselves, require
// an admin-created subscriber with an active subscription) - this page
// exists only because Google refuses to run its sign-in inside an
// embedded app webview, so the Windows app opens this in a real browser
// instead and gets handed back a session token via a local redirect.
export async function appLogin(
  credential: string,
  deviceId: string
): Promise<{ ok: true; sessionToken: string } | { ok: false; error: string }> {
  const email = await verifyGoogleIdToken(credential);
  if (!email) return { ok: false, error: "invalid_google_token" };

  const [subscriber] = await db.select().from(subscribers).where(eq(subscribers.email, email));
  if (!subscriber) return { ok: false, error: "not_a_subscriber" };

  const status = await getSubscriptionStatus(subscriber.id);
  if (!status.active) return { ok: false, error: "no_active_subscription" };

  const sessionToken = await startAppSession(subscriber.id, deviceId);
  return { ok: true, sessionToken };
}
