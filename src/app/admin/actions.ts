"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { songs } from "@/lib/schema";
import { checkPassword, createSession, clearSession } from "@/lib/auth";

export async function login(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (!checkPassword(password)) {
    redirect("/admin?error=1");
  }
  await createSession();
  redirect("/admin/dashboard");
}

export async function logout() {
  await clearSession();
  redirect("/admin");
}

export async function addSong(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const movie = String(formData.get("movie") ?? "").trim();
  const hero = String(formData.get("hero") ?? "").trim();
  const language = String(formData.get("language") ?? "Telugu").trim();
  if (!title) return;
  await db.insert(songs).values({ title, movie, hero, language, createdAt: Date.now() });
  revalidatePath("/admin/dashboard");
  revalidatePath("/");
}

export async function deleteSong(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!id) return;
  await db.delete(songs).where(eq(songs.id, id));
  revalidatePath("/admin/dashboard");
  revalidatePath("/");
}
