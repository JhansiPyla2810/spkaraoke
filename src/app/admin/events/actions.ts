"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { events, accessGrants } from "@/lib/schema";
import { lockdownFolderVideos, grantFolderAccess, createEventFolder, extractDriveFolderId } from "@/lib/drive";
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

  let permissionId: string;
  try {
    const accessToken = await getAccessTokenFromRefreshToken();
    permissionId = await grantFolderAccess(event.driveFolderId, clientEmail, accessToken);
  } catch (e) {
    console.error(e);
    redirect(`/admin/events/${eventId}?grant_error=1`);
  }

  const token = generateAccessToken();
  await db.insert(accessGrants).values({
    token,
    eventId,
    clientName,
    clientEmail,
    startsAt,
    expiresAt,
    revoked: false,
    drivePermissionId: permissionId,
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

  let permissionId = grant.drivePermissionId;
  if (!permissionId) {
    // Already expired and its Drive access was cleaned up — re-grant it.
    const [event] = await db.select().from(events).where(eq(events.id, grant.eventId));
    if (!event) return;
    try {
      const accessToken = await getAccessTokenFromRefreshToken();
      permissionId = await grantFolderAccess(event.driveFolderId, grant.clientEmail, accessToken);
    } catch (e) {
      console.error(e);
      redirect(`/admin/events/${eventId}?grant_error=1`);
    }
  }

  await db
    .update(accessGrants)
    .set({ expiresAt: newExpiresAt, drivePermissionId: permissionId })
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
    redirectUrl = `/admin/events/${eventId}?locked=${result.newlyLocked}&already=${result.alreadyLocked}&failed=${result.failed}&total=${result.total}`;
  } catch (e) {
    console.error(e);
    redirectUrl = `/admin/events/${eventId}?lockdown_error=1`;
  }
  redirect(redirectUrl);
}
