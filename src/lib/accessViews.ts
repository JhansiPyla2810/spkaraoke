import { headers } from "next/headers";
import { eq, desc } from "drizzle-orm";
import { db } from "./db";
import { accessViews } from "./schema";

export async function logAccessView(grantId: number): Promise<void> {
  const hdrs = await headers();
  const ip =
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    hdrs.get("x-real-ip") ||
    "unknown";
  const userAgent = hdrs.get("user-agent") ?? "unknown";

  await db.insert(accessViews).values({
    grantId,
    ip,
    userAgent,
    viewedAt: Date.now(),
  });
}

export async function getGrantViews(grantId: number) {
  return db
    .select()
    .from(accessViews)
    .where(eq(accessViews.grantId, grantId))
    .orderBy(desc(accessViews.viewedAt));
}

// Rough, human-readable device summary from a user-agent string — not meant
// to be precise, just enough to tell "iPhone" from "Windows Chrome" at a
// glance when comparing views on the same link.
export function summarizeUserAgent(ua: string): string {
  if (/iPhone/i.test(ua)) return "iPhone";
  if (/iPad/i.test(ua)) return "iPad";
  if (/Android/i.test(ua)) return /Mobile/i.test(ua) ? "Android phone" : "Android tablet";
  if (/Macintosh/i.test(ua)) return "Mac";
  if (/Windows/i.test(ua)) return "Windows PC";
  if (/Linux/i.test(ua)) return "Linux";
  return "Unknown device";
}
