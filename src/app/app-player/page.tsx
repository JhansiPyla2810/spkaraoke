import { Suspense } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { events, subscribers } from "@/lib/schema";
import { checkAppSession } from "@/lib/appAuth";
import AppVideoSection from "./AppVideoSection";

const ALL_SONGS_EVENT_NAME = "All Songs";

function Message({ text }: { text: string }) {
  return (
    <div style={{ maxWidth: 480, margin: "120px auto", padding: "0 24px", textAlign: "center" }}>
      <p style={{ color: "var(--muted)" }}>{text}</p>
    </div>
  );
}

// Loaded inside the Electron app's main window after a successful
// /app-login - the session token travels as a query param here the same
// way it travels back to the app via the loopback callback. Independent of
// the website's own /watch/[token] page: different auth model (a
// subscription session, not a one-off grant), different catalog scope
// (always the full "All Songs" library).
export default async function AppPlayerPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) return <Message text="Missing session. Please sign in again from the app." />;

  const session = await checkAppSession(token);
  if (!session.ok) {
    return (
      <Message
        text={
          session.reason === "not_subscribed"
            ? "Your subscription isn't active right now."
            : "Your session has ended. Please sign in again from the app."
        }
      />
    );
  }

  const [subscriber] = await db.select().from(subscribers).where(eq(subscribers.id, session.subscriberId));
  const [event] = await db.select().from(events).where(eq(events.name, ALL_SONGS_EVENT_NAME));
  if (!event) return <Message text="The video catalog isn't set up yet." />;

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "48px 20px 80px" }}>
      <div
        style={{
          borderRadius: 16,
          padding: "clamp(18px, 4vw, 28px)",
          marginBottom: 32,
          background: "var(--surface)",
          border: "1px solid var(--line)",
          boxShadow: "0 24px 48px -32px rgba(0,0,0,.28)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <div>
            <p className="eyebrow" style={{ marginBottom: 6 }}>
              Welcome back, {subscriber?.name || subscriber?.email}
            </p>
            <h1 style={{ fontSize: "clamp(1.4rem, 3vw, 2rem)", marginBottom: 10 }}>All Songs</h1>
            <p style={{ color: "var(--muted)", fontSize: ".9rem", margin: 0 }}>
              Subscription active until{" "}
              <b style={{ color: "var(--ink)" }}>{new Date(session.status.expiresAt).toLocaleString()}</b>
            </p>
          </div>
          <a className="btn btn-ghost" href={`/?token=${encodeURIComponent(token)}`}>
            Home
          </a>
        </div>
      </div>

      <Suspense fallback={<p style={{ color: "var(--muted)" }}>Loading videos...</p>}>
        <AppVideoSection
          driveFolderId={event.driveFolderId}
          subscriberLabel={subscriber?.name || subscriber?.email || ""}
          expiresAt={session.status.expiresAt}
          sessionToken={token}
          backendUrl=""
        />
      </Suspense>
    </div>
  );
}
