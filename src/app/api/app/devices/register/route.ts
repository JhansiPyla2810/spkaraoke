import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { appSessions, devices } from "@/lib/schema";
import { checkAppSession } from "@/lib/appAuth";
import { isValidDevicePublicKey } from "@/lib/keyWrap";

// Registers (or refreshes) this app install's public device key so content
// keys for offline downloads can later be wrapped to it. Idempotent - the
// app calls it after every sign-in and on startup with a saved session.
export async function POST(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return NextResponse.json({ ok: false, error: "missing_token" }, { status: 401 });

  const session = await checkAppSession(token);
  if (!session.ok) return NextResponse.json({ ok: false, error: session.reason }, { status: 401 });

  let body: { deviceId?: string; publicKey?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
  const { deviceId, publicKey } = body;
  if (!deviceId || !publicKey) {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  // The device registering must be the same install this session was
  // issued to at login - stops a session token being used to register some
  // other machine's key under this subscriber.
  const [sessionRow] = await db.select().from(appSessions).where(eq(appSessions.sessionToken, token));
  if (!sessionRow || sessionRow.deviceId !== deviceId) {
    return NextResponse.json({ ok: false, error: "device_mismatch" }, { status: 403 });
  }

  const publicKeyDer = Buffer.from(publicKey, "base64");
  if (!isValidDevicePublicKey(publicKeyDer)) {
    return NextResponse.json({ ok: false, error: "invalid_public_key" }, { status: 400 });
  }

  const now = Date.now();
  const [existing] = await db.select().from(devices).where(eq(devices.deviceId, deviceId));

  if (existing) {
    // A deactivated device stays deactivated - re-registering must not
    // quietly undo an admin's decision.
    if (existing.status !== "active") {
      return NextResponse.json({ ok: false, error: "device_deactivated" }, { status: 403 });
    }
    // Same install, possibly a different subscriber signing in on a shared
    // computer, or regenerated keys after the app's data was reset.
    await db
      .update(devices)
      .set({ subscriberId: session.subscriberId, publicKey, lastSeenAt: now })
      .where(eq(devices.id, existing.id));
  } else {
    await db.insert(devices).values({
      subscriberId: session.subscriberId,
      deviceId,
      publicKey,
      status: "active",
      registeredAt: now,
      lastSeenAt: now,
    });
  }

  return NextResponse.json({ ok: true });
}
