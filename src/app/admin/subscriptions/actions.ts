"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { subscribers, subscriptions, appSessions } from "@/lib/schema";
import { PLAN_DURATION_DAYS, type SubscriptionPlan } from "@/lib/subscriptions";

export async function createSubscriber(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  if (!email) return;

  const [existing] = await db.select().from(subscribers).where(eq(subscribers.email, email));
  if (existing) return;

  await db.insert(subscribers).values({ email, name, createdAt: Date.now() });
  revalidatePath("/admin/subscriptions");
}

export async function deleteSubscriber(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!id) return;

  const subs = await db.select().from(subscriptions).where(eq(subscriptions.subscriberId, id));
  for (const s of subs) {
    await db.delete(subscriptions).where(eq(subscriptions.id, s.id));
  }
  await db.delete(appSessions).where(eq(appSessions.subscriberId, id));
  await db.delete(subscribers).where(eq(subscribers.id, id));
  revalidatePath("/admin/subscriptions");
}

// Starts (or renews) a subscription for a subscriber - always creates a new
// row rather than editing an existing one, so past periods stay in history.
// If they still have time left on a current period, the new period starts
// after that instead of from today, so an early renewal doesn't waste days.
export async function createSubscription(formData: FormData) {
  const subscriberId = Number(formData.get("subscriberId"));
  const plan = String(formData.get("plan") ?? "") as SubscriptionPlan;
  if (!subscriberId || !PLAN_DURATION_DAYS[plan]) return;

  const existing = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.subscriberId, subscriberId));
  const latestExpiry = existing
    .filter((s) => !s.revoked)
    .reduce((max, s) => Math.max(max, s.expiresAt), 0);

  const startsAt = Math.max(Date.now(), latestExpiry);
  const expiresAt = startsAt + PLAN_DURATION_DAYS[plan] * 24 * 60 * 60 * 1000;

  await db.insert(subscriptions).values({
    subscriberId,
    plan,
    startsAt,
    expiresAt,
    suspended: false,
    revoked: false,
    createdAt: Date.now(),
  });
  revalidatePath("/admin/subscriptions");
}

export async function extendSubscription(formData: FormData) {
  const id = Number(formData.get("id"));
  const days = Number(formData.get("days"));
  if (!id || !days) return;

  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.id, id));
  if (!sub) return;

  const newExpiresAt = Math.max(sub.expiresAt, Date.now()) + days * 24 * 60 * 60 * 1000;
  await db.update(subscriptions).set({ expiresAt: newExpiresAt }).where(eq(subscriptions.id, id));
  revalidatePath("/admin/subscriptions");
}

export async function suspendSubscription(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!id) return;
  await db.update(subscriptions).set({ suspended: true }).where(eq(subscriptions.id, id));
  revalidatePath("/admin/subscriptions");
}

export async function reactivateSubscription(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!id) return;
  await db.update(subscriptions).set({ suspended: false }).where(eq(subscriptions.id, id));
  revalidatePath("/admin/subscriptions");
}

export async function revokeSubscription(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!id) return;
  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.id, id));
  if (!sub) return;
  await db.update(subscriptions).set({ revoked: true }).where(eq(subscriptions.id, id));
  // Revoking should also kick any currently-logged-in app session
  // immediately, not just block future logins.
  await db.delete(appSessions).where(eq(appSessions.subscriberId, sub.subscriberId));
  revalidatePath("/admin/subscriptions");
}
