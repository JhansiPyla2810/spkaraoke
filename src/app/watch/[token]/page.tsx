import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { accessGrants, events } from "@/lib/schema";
import { listVideosWithAccessToken } from "@/lib/drive";
import { getAccessTokenFromRefreshToken } from "@/lib/googleAuth";
import { cleanupGrantDriveAccess } from "@/lib/grantCleanup";
import { logAccessView } from "@/lib/accessViews";
import VideoGallery from "./VideoGallery";
import AutoExpireWatcher from "./AutoExpireWatcher";
import LocalTime from "@/app/components/LocalTime";

export const dynamic = "force-dynamic";

function ExpiredNotice({ message }: { message: string }) {
  return (
    <div style={{ maxWidth: 480, margin: "120px auto", padding: "0 24px", textAlign: "center" }}>
      <h1 style={{ fontFamily: "Archivo, sans-serif", fontSize: "1.4rem", marginBottom: 12 }}>
        {message}
      </h1>
      <p style={{ color: "var(--muted)" }}>
        If you think this is a mistake, contact us and we&apos;ll send a fresh link.
      </p>
    </div>
  );
}

export default async function WatchPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const [grant] = await db.select().from(accessGrants).where(eq(accessGrants.token, token));
  if (!grant) return <ExpiredNotice message="This link isn't valid." />;
  if (grant.revoked) return <ExpiredNotice message="This link has been revoked." />;
  if (grant.startsAt > Date.now()) {
    return <ExpiredNotice message="This link isn't active yet. Please check back at the scheduled time." />;
  }
  if (grant.expiresAt < Date.now()) {
    await cleanupGrantDriveAccess(grant);
    return <ExpiredNotice message="This link has expired." />;
  }

  const [event] = await db.select().from(events).where(eq(events.id, grant.eventId));
  if (!event) return <ExpiredNotice message="This link isn't valid." />;

  try {
    await logAccessView(grant.id);
  } catch (e) {
    console.error("Failed to log access view", e);
  }

  let videos: { id: string; name: string }[] = [];
  let loadError = false;
  try {
    const accessToken = await getAccessTokenFromRefreshToken();
    videos = await listVideosWithAccessToken(event.driveFolderId, accessToken);
  } catch {
    loadError = true;
  }

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "48px 20px 80px" }}>
      <AutoExpireWatcher expiresAt={grant.expiresAt} />

      <div
        style={{
          borderRadius: 16,
          padding: "clamp(18px, 4vw, 28px)",
          marginBottom: 32,
          position: "relative",
          overflow: "hidden",
          background: "var(--surface)",
          border: "1px solid var(--line)",
          boxShadow: "0 24px 48px -32px rgba(0,0,0,.28)",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: "var(--brand-gradient)",
          }}
        />
        <p className="eyebrow" style={{ marginBottom: 6 }}>
          Hi {grant.clientName}, welcome to
        </p>
        <h1 style={{ fontSize: "clamp(1.4rem, 3vw, 2rem)", marginBottom: 10 }}>{event.name}</h1>
        <p style={{ color: "var(--muted)", fontSize: ".9rem", margin: 0 }}>
          Access expires <b style={{ color: "var(--ink)" }}><LocalTime ms={grant.expiresAt} /></b>
        </p>
      </div>

      {loadError && (
        <p style={{ color: "var(--muted)" }}>
          Couldn&apos;t load the videos right now. Please refresh, or contact us if this keeps happening.
        </p>
      )}

      {!loadError && videos.length === 0 && (
        <p style={{ color: "var(--muted)" }}>No videos have been added to this event yet.</p>
      )}

      {!loadError && videos.length > 0 && (
        <VideoGallery
          videos={videos}
          clientName={grant.clientName}
          expiresAt={grant.expiresAt}
          grantToken={grant.token}
        />
      )}
    </div>
  );
}
