import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { accessGrants, events } from "@/lib/schema";
import { listVideosInFolder } from "@/lib/drive";

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

export default async function WatchPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const [grant] = await db.select().from(accessGrants).where(eq(accessGrants.token, token));
  if (!grant) return <ExpiredNotice message="This link isn't valid." />;
  if (grant.revoked) return <ExpiredNotice message="This link has been revoked." />;
  if (grant.expiresAt < Date.now()) return <ExpiredNotice message="This link has expired." />;

  const [event] = await db.select().from(events).where(eq(events.id, grant.eventId));
  if (!event) return <ExpiredNotice message="This link isn't valid." />;

  let videos: { id: string; name: string }[] = [];
  let loadError = false;
  try {
    videos = await listVideosInFolder(event.driveFolderId);
  } catch {
    loadError = true;
  }

  const expiresLabel = new Date(grant.expiresAt).toLocaleString();

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 24px 80px" }}>
      <div
        style={{
          border: "1px solid var(--line)",
          background: "var(--surface2)",
          borderRadius: 10,
          padding: "12px 18px",
          marginBottom: 28,
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
          fontSize: ".86rem",
        }}
      >
        <span>
          Hi <b>{grant.clientName}</b> — welcome to <b>{event.name}</b>
        </span>
        <span style={{ color: "var(--muted)" }}>Access expires {expiresLabel}</span>
      </div>

      {loadError && (
        <p style={{ color: "var(--muted)" }}>
          Couldn&apos;t load the videos right now. Please refresh, or contact us if this keeps happening.
        </p>
      )}

      {!loadError && videos.length === 0 && (
        <p style={{ color: "var(--muted)" }}>No videos have been added to this event yet.</p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        {videos.map((v) => (
          <div key={v.id}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>{v.name}</div>
            <div
              style={{
                position: "relative",
                width: "100%",
                aspectRatio: "16/9",
                borderRadius: 10,
                overflow: "hidden",
                border: "1px solid var(--line)",
                background: "#000",
              }}
            >
              <iframe
                src={`https://drive.google.com/file/d/${v.id}/preview`}
                allow="autoplay"
                style={{ width: "100%", height: "100%", border: "none" }}
                allowFullScreen
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
