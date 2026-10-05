import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { accessGrants, events } from "@/lib/schema";
import { getAccessTokenFromRefreshToken } from "@/lib/googleAuth";

// Node runtime (not Edge) — Edge is incompatible with the local dev SQLite
// file database. Extend the duration since a full (non-ranged) request for
// a large video can take a while for Drive to fully hand over.
export const maxDuration = 60;

// Streams a Drive video's bytes through our own server, gated by a valid
// (non-expired, non-revoked) client access token — so the browser never
// needs a raw, public Drive URL, and <video> gets a same-origin src it can
// seek within via normal Range requests.
export async function GET(request: NextRequest, { params }: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await params;
  const token = request.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

  const [grant] = await db.select().from(accessGrants).where(eq(accessGrants.token, token));
  if (!grant || grant.revoked || grant.expiresAt < Date.now()) {
    return NextResponse.json({ error: "Link is invalid, revoked, or expired" }, { status: 403 });
  }

  const [event] = await db.select().from(events).where(eq(events.id, grant.eventId));
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Single-device lock temporarily disabled — see src/app/watch/[token]/page.tsx.

  let accessToken: string;
  try {
    accessToken = await getAccessTokenFromRefreshToken();
  } catch {
    return NextResponse.json({ error: "Drive isn't connected" }, { status: 502 });
  }

  // Confirm this file actually belongs to the grant's own event folder —
  // without this, a valid token for one event could be used to stream any
  // file ID by guessing/observing another event's video IDs.
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
  // Drive never advertises this itself, even though it does honor Range
  // requests correctly — set it ourselves so browsers (especially iOS
  // Safari) know they can seek.
  headers.set("accept-ranges", "bytes");
  headers.set("cache-control", "private, no-store");

  return new NextResponse(driveRes.body, { status: driveRes.status, headers });
}
