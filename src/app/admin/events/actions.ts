"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { events, accessGrants } from "@/lib/schema";
import { extractDriveFolderId, lockdownFolderVideos } from "@/lib/drive";
import { generateAccessToken } from "@/lib/access";
import { getAccessTokenFromRefreshToken } from "@/lib/googleAuth";

export async function createEvent(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const folderInput = String(formData.get("folderLink") ?? "").trim();
  if (!name || !folderInput) return;

  const driveFolderId = extractDriveFolderId(folderInput);
  if (!driveFolderId) return;

  await db.insert(events).values({ name, driveFolderId, createdAt: Date.now() });
  revalidatePath("/admin/events");
}

export async function deleteEvent(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!id) return;
  await db.delete(accessGrants).where(eq(accessGrants.eventId, id));
  await db.delete(events).where(eq(events.id, id));
  revalidatePath("/admin/events");
}

export async function createGrant(formData: FormData) {
  const eventId = Number(formData.get("eventId"));
  const clientName = String(formData.get("clientName") ?? "").trim();
  const expiresAt = Number(formData.get("expiresAtMs"));
  if (!eventId || !clientName || !expiresAt || Number.isNaN(expiresAt)) return;

  const token = generateAccessToken();
  await db.insert(accessGrants).values({
    token,
    eventId,
    clientName,
    expiresAt,
    revoked: false,
    createdAt: Date.now(),
  });
  revalidatePath(`/admin/events/${eventId}`);
}

export async function revokeGrant(formData: FormData) {
  const id = Number(formData.get("id"));
  const eventId = Number(formData.get("eventId"));
  if (!id) return;
  await db.update(accessGrants).set({ revoked: true }).where(eq(accessGrants.id, id));
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
