import { eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/schema";

export type SubscriptionPlan = "monthly" | "quarterly" | "annual";

export const PLAN_DURATION_DAYS: Record<SubscriptionPlan, number> = {
  monthly: 30,
  quarterly: 90,
  annual: 365,
};

export type SubscriptionStatus =
  | { active: false; reason: "none" | "expired" | "suspended" | "revoked" }
  | { active: true; expiresAt: number; plan: SubscriptionPlan };

// The single source of truth for "can this subscriber stream right now" -
// both the Electron app's own status check and the admin panel's display
// go through this, so there's exactly one place that defines "active".
export async function getSubscriptionStatus(subscriberId: number): Promise<SubscriptionStatus> {
  const [latest] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.subscriberId, subscriberId))
    .orderBy(desc(subscriptions.expiresAt))
    .limit(1);

  if (!latest) return { active: false, reason: "none" };
  if (latest.revoked) return { active: false, reason: "revoked" };
  if (latest.suspended) return { active: false, reason: "suspended" };
  if (latest.expiresAt < Date.now()) return { active: false, reason: "expired" };

  return { active: true, expiresAt: latest.expiresAt, plan: latest.plan as SubscriptionPlan };
}
