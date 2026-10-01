import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import { eq, desc } from "drizzle-orm";
import { isAuthed } from "@/lib/auth";
import { db } from "@/lib/db";
import { events, accessGrants } from "@/lib/schema";
import { isGoogleConnected } from "@/lib/googleAuth";
import { createGrant, revokeGrant, lockdownEvent } from "../actions";
import ExpiryInput from "./ExpiryInput";
import LocalTime from "@/app/components/LocalTime";

export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ locked?: string; already?: string; failed?: string; total?: string; lockdown_error?: string }>;
}) {
  if (!(await isAuthed())) redirect("/admin");

  const { id } = await params;
  const eventId = Number(id);
  const [event] = await db.select().from(events).where(eq(events.id, eventId));
  if (!event) notFound();

  const connected = await isGoogleConnected();
  const sp = await searchParams;

  const grants = await db
    .select()
    .from(accessGrants)
    .where(eq(accessGrants.eventId, eventId))
    .orderBy(desc(accessGrants.id));

  const hdrs = await headers();
  const host = hdrs.get("host") ?? "spkaraoke.vercel.app";
  const protocol = host.includes("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  const now = Date.now();

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px 80px" }}>
      <p style={{ fontSize: ".82rem", marginBottom: 8 }}>
        <Link href="/admin/events" style={{ color: "var(--muted)", textDecoration: "none" }}>
          ← All events
        </Link>
      </p>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <h1 style={{ fontFamily: "Archivo, sans-serif", fontSize: "1.5rem" }}>
          {event.name}
        </h1>
        <form action={lockdownEvent}>
          <input type="hidden" name="eventId" value={event.id} />
          <button className="btn btn-ghost" type="submit" disabled={!connected}>
            Lock down videos
          </button>
        </form>
      </div>

      {!connected && (
        <p style={{ color: "var(--muted)", fontSize: ".85rem", marginBottom: 20 }}>
          <Link href="/admin/events" style={{ color: "var(--accent)", fontWeight: 700 }}>
            Connect Google Drive
          </Link>{" "}
          first to enable bulk lockdown.
        </p>
      )}
      {sp.total && (
        <p style={{ color: "var(--good)", fontWeight: 600, fontSize: ".9rem", marginBottom: 20 }}>
          Checked {sp.total} video{sp.total === "1" ? "" : "s"}: {sp.locked} newly locked,{" "}
          {sp.already} already locked{Number(sp.failed) > 0 ? `, ${sp.failed} failed` : ""}.
        </p>
      )}
      {sp.lockdown_error && (
        <p style={{ color: "#B02A37", fontWeight: 600, fontSize: ".9rem", marginBottom: 20 }}>
          Couldn&apos;t reach Google Drive to lock down this event. Try reconnecting Google Drive.
        </p>
      )}

      <form
        action={createGrant}
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 10, marginBottom: 32, alignItems: "end" }}
      >
        <input type="hidden" name="eventId" value={event.id} />
        <input type="hidden" name="expiresAtMs" />
        <div className="form-row" style={{ marginBottom: 0 }}>
          <label htmlFor="clientName">Client name</label>
          <input id="clientName" name="clientName" required />
        </div>
        <ExpiryInput />
        <button className="btn btn-primary" type="submit">Generate link</button>
      </form>

      <div className="songtable-wrap">
        <table>
          <thead>
            <tr>
              <th>Client</th>
              <th>Link</th>
              <th>Expires</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {grants.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <div className="emptystate">No access links yet for this event.</div>
                </td>
              </tr>
            ) : (
              grants.map((g) => {
                const expired = g.expiresAt < now;
                const status = g.revoked ? "Revoked" : expired ? "Expired" : "Active";
                const statusColor = g.revoked || expired ? "var(--muted)" : "var(--good)";
                const link = `${baseUrl}/watch/${g.token}`;
                return (
                  <tr key={g.id}>
                    <td>{g.clientName}</td>
                    <td style={{ fontSize: ".8rem" }}>
                      {!g.revoked && !expired ? (
                        <a href={link} target="_blank" rel="noopener" style={{ color: "var(--accent)" }}>
                          {link}
                        </a>
                      ) : (
                        <span style={{ color: "var(--muted)" }}>{link}</span>
                      )}
                    </td>
                    <td style={{ fontSize: ".82rem", color: "var(--muted)" }}>
                      <LocalTime ms={g.expiresAt} />
                    </td>
                    <td style={{ fontSize: ".82rem", fontWeight: 700, color: statusColor }}>{status}</td>
                    <td>
                      {!g.revoked && (
                        <form action={revokeGrant}>
                          <input type="hidden" name="id" value={g.id} />
                          <input type="hidden" name="eventId" value={event.id} />
                          <button
                            type="submit"
                            style={{ background: "none", border: "none", color: "#B02A37", cursor: "pointer", fontWeight: 700 }}
                          >
                            Revoke
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
