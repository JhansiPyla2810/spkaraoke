import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { events } from "@/lib/schema";
import { listVideosWithAccessToken } from "@/lib/drive";
import { getAccessTokenFromRefreshToken } from "@/lib/googleAuth";
import { checkAppSession } from "@/lib/appAuth";

// Full catalog is always the "All Songs" event folder - subscribers get
// everything, not a per-grant subset like the one-off website links.
const ALL_SONGS_EVENT_NAME = "All Songs";

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return NextResponse.json({ error: "missing_token" }, { status: 401 });

  const session = await checkAppSession(token);
  if (!session.ok) return NextResponse.json({ error: session.reason }, { status: 401 });

  const [event] = await db.select().from(events).where(eq(events.name, ALL_SONGS_EVENT_NAME));
  if (!event) return NextResponse.json({ error: "catalog_not_found" }, { status: 404 });

  try {
    const accessToken = await getAccessTokenFromRefreshToken();
    const videos = await listVideosWithAccessToken(event.driveFolderId, accessToken);
    return NextResponse.json({ videos });
  } catch {
    return NextResponse.json({ error: "drive_unavailable" }, { status: 502 });
  }
}
