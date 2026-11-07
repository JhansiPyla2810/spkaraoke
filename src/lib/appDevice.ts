import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { appSessions, devices } from "@/lib/schema";
import { checkAppSession } from "@/lib/appAuth";

export type AppDeviceCheck =
  | { ok: true; subscriberId: number; deviceId: string; devicePublicKey: string }
  | { ok: false; response: NextResponse };

function deny(error: string, status: number): AppDeviceCheck {
  return { ok: false, response: NextResponse.json({ ok: false, error }, { status }) };
}

// Gate for every offline-download route: an active subscription session,
// whose install has registered a device key under this same subscriber,
// and that device hasn't been deactivated.
export async function requireAppDevice(request: NextRequest): Promise<AppDeviceCheck> {
  const auth = request.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return deny("missing_token", 401);

  const session = await checkAppSession(token);
  if (!session.ok) return deny(session.reason, 401);

  const [sessionRow] = await db.select().from(appSessions).where(eq(appSessions.sessionToken, token));
  if (!sessionRow) return deny("invalid_session", 401);

  const [device] = await db.select().from(devices).where(eq(devices.deviceId, sessionRow.deviceId));
  if (!device || device.subscriberId !== session.subscriberId) return deny("device_not_registered", 403);
  if (device.status !== "active") return deny("device_deactivated", 403);

  await db.update(devices).set({ lastSeenAt: Date.now() }).where(eq(devices.id, device.id));

  return {
    ok: true,
    subscriberId: session.subscriberId,
    deviceId: device.deviceId,
    devicePublicKey: device.publicKey,
  };
}
