"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { events } from "@/lib/schema";
import { getAccessTokenFromRefreshToken } from "@/lib/googleAuth";
import { createResumableUploadSession, deleteFile, renameFile } from "@/lib/drive";

async function getFolderId(eventId: number): Promise<string> {
  const [event] = await db.select().from(events).where(eq(events.id, eventId));
  if (!event) throw new Error("Event not found");
  return event.driveFolderId;
}

export async function requestUploadSession(eventId: number, fileName: string, mimeType: string) {
  const folderId = await getFolderId(eventId);
  const accessToken = await getAccessTokenFromRefreshToken();
  const uploadUrl = await createResumableUploadSession(folderId, fileName, mimeType, accessToken);
  return { uploadUrl };
}

export async function finishUpload(eventId: number) {
  revalidatePath(`/admin/events/${eventId}/videos`);
}

export async function deleteVideo(formData: FormData) {
  const eventId = Number(formData.get("eventId"));
  const fileId = String(formData.get("fileId") ?? "");
  if (!eventId || !fileId) return;

  const accessToken = await getAccessTokenFromRefreshToken();
  await deleteFile(fileId, accessToken);
  revalidatePath(`/admin/events/${eventId}/videos`);
}

export async function renameVideo(formData: FormData) {
  const eventId = Number(formData.get("eventId"));
  const fileId = String(formData.get("fileId") ?? "");
  const newName = String(formData.get("newName") ?? "").trim();
  if (!eventId || !fileId || !newName) return;

  const accessToken = await getAccessTokenFromRefreshToken();
  await renameFile(fileId, newName, accessToken);
  revalidatePath(`/admin/events/${eventId}/videos`);
}
