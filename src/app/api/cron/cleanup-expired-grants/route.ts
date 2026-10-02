import { NextRequest, NextResponse } from "next/server";
import { lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { accessGrants } from "@/lib/schema";
import { cleanupGrantDriveAccess } from "@/lib/grantCleanup";

// Daily safety net: revokes Drive access for any grant that expired but was
// never revisited (the lazy cleanup on /watch/[token] only runs when
// someone actually opens that expired link).
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const expiredGrants = await db
    .select()
    .from(accessGrants)
    .where(lt(accessGrants.expiresAt, Date.now()));

  const pending = expiredGrants.filter((g) => g.drivePermissionId !== null);
  for (const grant of pending) {
    await cleanupGrantDriveAccess(grant);
  }

  return NextResponse.json({ checked: expiredGrants.length, cleaned: pending.length });
}
