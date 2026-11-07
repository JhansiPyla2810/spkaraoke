import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { appSessions } from "@/lib/schema";
import { getSubscriptionStatus, type SubscriptionStatus } from "@/lib/subscriptions";

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export type AppSessionCheck =
  | { ok: true; subscriberId: number; status: SubscriptionStatus & { active: true } }
  | { ok: false; reason: "invalid_session" | "not_subscribed" };

// Validates a bearer token from the Electron app against the single active
// session row for its subscriber (logging in elsewhere deletes this row -
// see login() below - so a stale token here means "signed in somewhere
// else since", not just "never logged in").
export async function checkAppSession(sessionToken: string): Promise<AppSessionCheck> {
  const [session] = await db.select().from(appSessions).where(eq(appSessions.sessionToken, sessionToken));
  if (!session) return { ok: false, reason: "invalid_session" };

  const status = await getSubscriptionStatus(session.subscriberId);
  if (!status.active) return { ok: false, reason: "not_subscribed" };

  await db
    .update(appSessions)
    .set({ lastSeenAt: Date.now() })
    .where(eq(appSessions.id, session.id));

  return { ok: true, subscriberId: session.subscriberId, status };
}

// Single-session-per-subscriber, same idea as the website's device lock:
// a fresh login replaces (not adds to) any existing session, so a
// subscription can't be used on two machines/app-installs at once.
export async function startAppSession(subscriberId: number, deviceId: string): Promise<string> {
  await db.delete(appSessions).where(eq(appSessions.subscriberId, subscriberId));

  const sessionToken = generateSessionToken();
  await db.insert(appSessions).values({
    subscriberId,
    sessionToken,
    deviceId,
    lastSeenAt: Date.now(),
    createdAt: Date.now(),
  });
  return sessionToken;
}
