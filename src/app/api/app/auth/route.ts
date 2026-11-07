import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { subscribers } from "@/lib/schema";
import { verifyGoogleIdToken } from "@/lib/googleSignIn";
import { getSubscriptionStatus } from "@/lib/subscriptions";
import { startAppSession } from "@/lib/appAuth";

// The Windows app's login: it sends the Google ID token from its own
// sign-in flow plus a locally-generated device id. We verify the token
// ourselves (never trust a client-asserted email), look up whether that
// email is a subscriber the admin has actually created, and - only if
// there's a currently-active subscription - issue a session token.
export async function POST(request: NextRequest) {
  let body: { credential?: string; deviceId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  const { credential, deviceId } = body;
  if (!credential || !deviceId) {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  const email = await verifyGoogleIdToken(credential);
  if (!email) {
    return NextResponse.json({ ok: false, error: "invalid_google_token" }, { status: 401 });
  }

  const [subscriber] = await db.select().from(subscribers).where(eq(subscribers.email, email));
  if (!subscriber) {
    return NextResponse.json({ ok: false, error: "not_a_subscriber" }, { status: 403 });
  }

  const status = await getSubscriptionStatus(subscriber.id);
  if (!status.active) {
    return NextResponse.json({ ok: false, error: "no_active_subscription", reason: status.reason }, { status: 403 });
  }

  const sessionToken = await startAppSession(subscriber.id, deviceId);

  return NextResponse.json({
    ok: true,
    sessionToken,
    subscription: { expiresAt: status.expiresAt, plan: status.plan },
  });
}
