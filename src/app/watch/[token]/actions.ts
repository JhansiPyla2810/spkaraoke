"use server";

import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { accessGrants } from "@/lib/schema";
import { deviceCookieName, generateDeviceId } from "@/lib/deviceSession";

// Used both for the very first (silent) claim of a link and for an
// explicit takeover from a different device — same operation either way:
// this device becomes the one allowed to use the link.
export async function claimDevice(token: string) {
  const [grant] = await db.select().from(accessGrants).where(eq(accessGrants.token, token));
  if (!grant) return;

  const deviceId = generateDeviceId();
  await db.update(accessGrants).set({ activeDeviceId: deviceId }).where(eq(accessGrants.id, grant.id));

  const store = await cookies();
  store.set(deviceCookieName(token), deviceId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}
