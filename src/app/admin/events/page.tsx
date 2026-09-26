import Link from "next/link";
import { redirect } from "next/navigation";
import { desc } from "drizzle-orm";
import { isAuthed } from "@/lib/auth";
import { db } from "@/lib/db";
import { events } from "@/lib/schema";
import { isGoogleConnected } from "@/lib/googleAuth";
import { createEvent, deleteEvent } from "./actions";

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ google_connected?: string; google_error?: string }>;
}) {
  if (!(await isAuthed())) redirect("/admin");

  const allEvents = await db.select().from(events).orderBy(desc(events.id));
  const connected = await isGoogleConnected();
  const { google_connected, google_error } = await searchParams;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px 80px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <h1 style={{ fontFamily: "Archivo, sans-serif", fontSize: "1.5rem" }}>
          Events ({allEvents.length})
        </h1>
        <Link className="btn btn-ghost" href="/admin/dashboard">← Songs</Link>
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
        Upload the event&apos;s videos to a Google Drive folder yourself first, share it as
        &quot;Anyone with the link&quot; (Viewer). Then paste that folder link below — once Google
        Drive is connected, use &quot;Lock down videos&quot; on the event page to block downloads
        for every video in the folder at once.
      </p>

      <form
        action={createEvent}
        style={{ display: "grid", gridTemplateColumns: "1fr 2fr auto", gap: 10, marginBottom: 32, alignItems: "end" }}
      >
        <div className="form-row" style={{ marginBottom: 0 }}>
          <label htmlFor="name">Event name</label>
          <input id="name" name="name" required />
        </div>
        <div className="form-row" style={{ marginBottom: 0 }}>
          <label htmlFor="folderLink">Google Drive folder link</label>
          <input id="folderLink" name="folderLink" placeholder="https://drive.google.com/drive/folders/..." required />
        </div>
        <button className="btn btn-primary" type="submit">Add event</button>
      </form>

      <div className="songtable-wrap">
        <table>
          <thead>
            <tr>
              <th>Event</th>
              <th>Drive folder ID</th>
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
                  <td style={{ color: "var(--muted)", fontFamily: "monospace", fontSize: ".82rem" }}>
                    {e.driveFolderId}
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
