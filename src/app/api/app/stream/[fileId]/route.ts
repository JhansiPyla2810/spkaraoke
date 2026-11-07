import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { events } from "@/lib/schema";
import { getAccessTokenFromRefreshToken } from "@/lib/googleAuth";
import { checkAppSession } from "@/lib/appAuth";

export const maxDuration = 60;

const ALL_SONGS_EVENT_NAME = "All Songs";

// Same shape as the website's /api/stream route (serves Drive bytes via the
// admin's own token, never the subscriber's), gated by the app's session
// token instead of a grant token. <video> can't set an Authorization
// header, so the token travels as a query param here too.
export async function GET(request: NextRequest, { params }: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await params;
  const token = request.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "missing_token" }, { status: 401 });

  const session = await checkAppSession(token);
  if (!session.ok) return NextResponse.json({ error: session.reason }, { status: 401 });

  const [event] = await db.select().from(events).where(eq(events.name, ALL_SONGS_EVENT_NAME));
  if (!event) return NextResponse.json({ error: "catalog_not_found" }, { status: 404 });

  let accessToken: string;
  try {
    accessToken = await getAccessTokenFromRefreshToken();
  } catch {
    return NextResponse.json({ error: "Drive isn't connected" }, { status: 502 });
  }

  // Confirm this file actually belongs to the All Songs folder - without
  // this, a valid session could stream any file ID by guessing/observing
  // IDs from elsewhere.
  const metaRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?fields=parents&supportsAllDrives=true`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!metaRes.ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const meta = (await metaRes.json()) as { parents?: string[] };
  if (!meta.parents?.includes(event.driveFolderId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const range = request.headers.get("range");
  const driveRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(range ? { Range: range } : {}),
      },
    }
  );

  if (!driveRes.ok && driveRes.status !== 206) {
    return NextResponse.json({ error: "Couldn't load video" }, { status: 502 });
  }

  const headers = new Headers();
  const passthrough = ["content-type", "content-length", "content-range"];
  for (const h of passthrough) {
    const v = driveRes.headers.get(h);
    if (v) headers.set(h, v);
  }
  headers.set("accept-ranges", "bytes");
  headers.set("cache-control", "private, no-store");

  return new NextResponse(driveRes.body, { status: driveRes.status, headers });
}
