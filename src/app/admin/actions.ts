"use server";

import { redirect } from "next/navigation";
import { checkPassword, createSession, clearSession } from "@/lib/auth";

export async function login(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (!checkPassword(password)) {
    redirect("/admin?error=1");
  }
  await createSession();
  redirect("/admin/events");
}

export async function logout() {
  await clearSession();
  redirect("/admin");
}
