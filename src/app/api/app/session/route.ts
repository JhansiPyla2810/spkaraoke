import { NextRequest, NextResponse } from "next/server";
import { checkAppSession } from "@/lib/appAuth";

// Polled periodically by the app while it's open, so a subscription that
// gets suspended/revoked/expires - or a session that's been replaced by a
// login elsewhere - gets noticed and acted on without waiting for the next
// app restart.
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return NextResponse.json({ ok: false, error: "missing_token" }, { status: 401 });

  const result = await checkAppSession(token);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.reason }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    subscription: { expiresAt: result.status.expiresAt, plan: result.status.plan },
  });
}
