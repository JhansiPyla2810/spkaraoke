import Link from "next/link";
import { redirect } from "next/navigation";
import { desc } from "drizzle-orm";
import { isAuthed } from "@/lib/auth";
import { db } from "@/lib/db";
import { events } from "@/lib/schema";
import { isGoogleConnected } from "@/lib/googleAuth";
import { createEvent, deleteEvent } from "./actions";
import { logout } from "../actions";

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ google_connected?: string; google_error?: string; create_error?: string }>;
}) {
  if (!(await isAuthed())) redirect("/admin");

  const allEvents = await db.select().from(events).orderBy(desc(events.id));
  const connected = await isGoogleConnected();
  const { google_connected, google_error, create_error } = await searchParams;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 16px 80px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28, flexWrap: "wrap", gap: 10 }}>
        <h1 style={{ fontFamily: "Archivo, sans-serif", fontSize: "1.5rem" }}>
          Events ({allEvents.length})
        </h1>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link className="btn btn-ghost" href="/admin/dashboard">Manage songs</Link>
          <form action={logout}>
            <button className="btn btn-ghost" type="submit">Log out</button>
          </form>
        </div>
      </div>

      {google_connected && (
        <p style={{ color: "var(--good)", fontWeight: 700, marginBottom: 16 }}>
          ✓ Google Drive connected — you can now use &quot;Lock down videos&quot; on any event.
        </p>
      )}
      {google_error && (
        <p style={{ color: "#B02A37", fontWeight: 700, marginBottom: 16 }}>
          Something went wrong connecting Google Drive. Try again.
        </p>
      )}
      {create_error === "bad_link" && (
        <p style={{ color: "#B02A37", fontWeight: 700, marginBottom: 16 }}>
          Couldn&apos;t read a folder ID from that link. Paste the full Drive folder share link.
        </p>
      )}
      {create_error && create_error !== "bad_link" && (
        <p style={{ color: "#B02A37", fontWeight: 700, marginBottom: 16 }}>
          Couldn&apos;t create the event&apos;s Drive folder. Make sure Google Drive is connected
          and try again.
        </p>
      )}

      <div
        style={{
          border: "1px solid var(--line)",
          borderRadius: 10,
          padding: "14px 18px",
          marginBottom: 20,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <span style={{ fontSize: ".9rem" }}>
          {connected ? (
            <>✓ Google Drive is connected for bulk video lockdown.</>
          ) : (
            <>Connect Google Drive to enable one-click &quot;Lock down videos&quot; per event.</>
          )}
        </span>
        <a className="btn btn-ghost" href="/api/google/oauth/start">
          {connected ? "Reconnect" : "Connect Google Drive"}
        </a>
      </div>

      <p style={{ color: "var(--muted)", fontSize: ".88rem", marginBottom: 20, maxWidth: "62ch" }}>
        Name the event and either leave the folder field blank (we&apos;ll create a matching folder
        automatically inside your connected Drive account&apos;s Events folder) or paste an existing
        Drive folder link to use that one instead. Upload videos from &quot;Manage videos&quot; on the
        event page, or directly in Drive. Each client is granted access to only their own event&apos;s
        folder when you generate their link, and that access is removed automatically when it&apos;s
        revoked or expires.
      </p>

      <form
        action={createEvent}
        style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 32, alignItems: "end" }}
      >
        <div className="form-row" style={{ marginBottom: 0, flex: "1 1 180px" }}>
          <label htmlFor="name">Event name</label>
          <input id="name" name="name" required style={{ width: "100%" }} />
        </div>
        <div className="form-row" style={{ marginBottom: 0, flex: "2 1 240px" }}>
          <label htmlFor="folderLink">Existing Drive folder link (optional)</label>
          <input
            id="folderLink"
            name="folderLink"
            placeholder="https://drive.google.com/drive/folders/..."
            style={{ width: "100%" }}
          />
        </div>
        <button className="btn btn-primary" type="submit">Create event folder</button>
      </form>

      <div className="songtable-wrap">
        <table>
          <thead>
            <tr>
              <th>Event</th>
              <th>Drive folder</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {allEvents.length === 0 ? (
              <tr>
                <td colSpan={3}>
                  <div className="emptystate">No events yet.</div>
                </td>
              </tr>
            ) : (
              allEvents.map((e) => (
                <tr key={e.id}>
                  <td>
                    <Link href={`/admin/events/${e.id}`} style={{ color: "var(--accent)", fontWeight: 700, textDecoration: "none" }}>
                      {e.name}
                    </Link>
                  </td>
                  <td style={{ fontSize: ".82rem" }}>
                    <a
                      href={`https://drive.google.com/drive/folders/${e.driveFolderId}`}
                      target="_blank"
                      rel="noopener"
                      style={{ color: "var(--accent)" }}
                    >
                      Open in Drive
                    </a>
                  </td>
                  <td>
                    <form action={deleteEvent}>
                      <input type="hidden" name="id" value={e.id} />
                      <button
                        type="submit"
                        style={{ background: "none", border: "none", color: "#B02A37", cursor: "pointer", fontWeight: 700 }}
                      >
                        Delete
                      </button>
                    </form>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
