"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { events, accessGrants } from "@/lib/schema";
import { lockdownFolderVideos, createEventFolder, extractDriveFolderId } from "@/lib/drive";
import { generateAccessToken } from "@/lib/access";
import { getAccessTokenFromRefreshToken } from "@/lib/googleAuth";
import { cleanupGrantDriveAccess } from "@/lib/grantCleanup";

export async function createEvent(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const folderLink = String(formData.get("folderLink") ?? "").trim();
  if (!name) return;

  let driveFolderId: string;
  if (folderLink) {
    const parsed = extractDriveFolderId(folderLink);
    if (!parsed) redirect("/admin/events?create_error=bad_link");
    driveFolderId = parsed;
  } else {
    try {
      const accessToken = await getAccessTokenFromRefreshToken();
      driveFolderId = await createEventFolder(name, accessToken);
    } catch (e) {
      console.error(e);
      redirect("/admin/events?create_error=1");
    }
  }

  await db.insert(events).values({ name, driveFolderId, createdAt: Date.now() });
  revalidatePath("/admin/events");
}

export async function deleteEvent(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!id) return;

  const [event] = await db.select().from(events).where(eq(events.id, id));
  if (!event || event.isProtected) return;

  const grants = await db.select().from(accessGrants).where(eq(accessGrants.eventId, id));
  for (const grant of grants) {
    await cleanupGrantDriveAccess(grant);
  }

  await db.delete(accessGrants).where(eq(accessGrants.eventId, id));
  await db.delete(events).where(eq(events.id, id));
  revalidatePath("/admin/events");
}

export async function createGrant(formData: FormData) {
  const eventId = Number(formData.get("eventId"));
  const clientName = String(formData.get("clientName") ?? "").trim();
  const clientEmail = String(formData.get("clientEmail") ?? "").trim().toLowerCase();
  const expiresAt = Number(formData.get("expiresAtMs"));
  const startsAtInput = Number(formData.get("startsAtMs"));
  const startsAt = startsAtInput || Date.now();
  if (!eventId || !clientName || !clientEmail || !expiresAt || Number.isNaN(expiresAt)) return;
  if (expiresAt <= Date.now()) redirect(`/admin/events/${eventId}?grant_error=past`);
  if (startsAt >= expiresAt) redirect(`/admin/events/${eventId}?grant_error=range`);

  const [event] = await db.select().from(events).where(eq(events.id, eventId));
  if (!event) return;
  if (!event.lockedDownAt) redirect(`/admin/events/${eventId}?grant_error=not_locked`);

  // No Drive-level sharing with the client's email anymore — playback goes
  // entirely through our own token+PIN+session-locked stream route, which
  // always fetches as the admin, so granting the client Drive access never
  // actually gated anything and only opened a direct-Drive-access window
  // we don't want. grantFolderAccess/revokeFolderAccess (@/lib/drive) and
  // cleanupGrantDriveAccess (@/lib/grantCleanup) are kept as unused
  // utilities in case a future feature needs them again.
  const token = generateAccessToken();
  await db.insert(accessGrants).values({
    token,
    eventId,
    clientName,
    clientEmail,
    startsAt,
    expiresAt,
    revoked: false,
    createdAt: Date.now(),
  });
  revalidatePath(`/admin/events/${eventId}`);
}

export async function extendGrant(formData: FormData) {
  const id = Number(formData.get("id"));
  const eventId = Number(formData.get("eventId"));
  const minutes = Number(formData.get("minutes"));
  if (!id || !eventId || !minutes) return;

  const [grant] = await db.select().from(accessGrants).where(eq(accessGrants.id, id));
  if (!grant || grant.revoked) return;

  const newExpiresAt = Math.max(grant.expiresAt, Date.now()) + minutes * 60_000;

  await db
    .update(accessGrants)
    .set({ expiresAt: newExpiresAt })
    .where(eq(accessGrants.id, id));
  revalidatePath(`/admin/events/${eventId}`);
}

export async function revokeGrant(formData: FormData) {
  const id = Number(formData.get("id"));
  const eventId = Number(formData.get("eventId"));
  if (!id) return;

  const [grant] = await db.select().from(accessGrants).where(eq(accessGrants.id, id));
  if (grant) await cleanupGrantDriveAccess(grant);

  await db.update(accessGrants).set({ revoked: true }).where(eq(accessGrants.id, id));
  revalidatePath(`/admin/events/${eventId}`);
}

export async function deleteGrant(formData: FormData) {
  const id = Number(formData.get("id"));
  const eventId = Number(formData.get("eventId"));
  if (!id) return;

  const [grant] = await db.select().from(accessGrants).where(eq(accessGrants.id, id));
  if (grant) await cleanupGrantDriveAccess(grant);

  await db.delete(accessGrants).where(eq(accessGrants.id, id));
  revalidatePath(`/admin/events/${eventId}`);
}

export async function lockdownEvent(formData: FormData) {
  const eventId = Number(formData.get("eventId"));
  if (!eventId) return;

  const [event] = await db.select().from(events).where(eq(events.id, eventId));
  if (!event) return;

  let redirectUrl: string;
  try {
    const accessToken = await getAccessTokenFromRefreshToken();
    const result = await lockdownFolderVideos(event.driveFolderId, accessToken);
    if (result.failed === 0) {
      await db.update(events).set({ lockedDownAt: Date.now() }).where(eq(events.id, eventId));
    } else {
      await db.update(events).set({ lockedDownAt: null }).where(eq(events.id, eventId));
    }
    const errorParam = result.firstError ? `&error_detail=${encodeURIComponent(result.firstError)}` : "";
    redirectUrl = `/admin/events/${eventId}?locked=${result.newlyLocked}&already=${result.alreadyLocked}&failed=${result.failed}&total=${result.total}${errorParam}`;
  } catch (e) {
    console.error(e);
    redirectUrl = `/admin/events/${eventId}?lockdown_error=1`;
  }
  redirect(redirectUrl);
}
