import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import { eq, desc, inArray } from "drizzle-orm";
import { isAuthed } from "@/lib/auth";
import { db } from "@/lib/db";
import { events, accessGrants, accessViews } from "@/lib/schema";
import { isGoogleConnected } from "@/lib/googleAuth";
import { createGrant, revokeGrant, deleteGrant, lockdownEvent } from "../actions";
import ExtendControl from "./ExtendControl";
import ExpiryInput from "./ExpiryInput";
import SubmitButton from "@/app/components/SubmitButton";
import LocalTime from "@/app/components/LocalTime";

export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ locked?: string; already?: string; failed?: string; total?: string; lockdown_error?: string; grant_error?: string }>;
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

  const grantIds = grants.map((g) => g.id);
  const views = grantIds.length
    ? await db.select().from(accessViews).where(inArray(accessViews.grantId, grantIds))
    : [];
  const viewStatsByGrant = new Map<number, { count: number; distinctIps: number }>();
  for (const g of grants) {
    const grantViews = views.filter((v) => v.grantId === g.id);
    const distinctIps = new Set(grantViews.map((v) => v.ip)).size;
    viewStatsByGrant.set(g.id, { count: grantViews.length, distinctIps });
  }

  const hdrs = await headers();
  const host = hdrs.get("host") ?? "spkaraoke.vercel.app";
  const protocol = host.includes("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  const now = Date.now();

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 16px 80px" }}>
      <p style={{ fontSize: ".82rem", marginBottom: 8 }}>
        <Link href="/admin/events" style={{ color: "var(--muted)", textDecoration: "none" }}>
          ← All events
        </Link>
      </p>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <h1 style={{ fontFamily: "Archivo, sans-serif", fontSize: "1.5rem" }}>
          {event.name}
        </h1>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href={`/admin/events/${event.id}/videos`} className="btn btn-ghost">
            Manage videos
          </Link>
          <form action={lockdownEvent}>
            <input type="hidden" name="eventId" value={event.id} />
            <button className="btn btn-ghost" type="submit" disabled={!connected}>
              Lock down videos
            </button>
          </form>
        </div>
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
      {sp.grant_error === "past" && (
        <p style={{ color: "#B02A37", fontWeight: 600, fontSize: ".9rem", marginBottom: 20 }}>
          That end time has already passed &mdash; double-check AM/PM and pick a time in the future.
        </p>
      )}
      {sp.grant_error === "range" && (
        <p style={{ color: "#B02A37", fontWeight: 600, fontSize: ".9rem", marginBottom: 20 }}>
          Access must start before it ends &mdash; check the start/end times.
        </p>
      )}
      {sp.grant_error && sp.grant_error !== "past" && sp.grant_error !== "range" && (
        <p style={{ color: "#B02A37", fontWeight: 600, fontSize: ".9rem", marginBottom: 20 }}>
          Couldn&apos;t grant that email access to the Drive folder. Check the email and that Google
          Drive is connected, then try again.
        </p>
      )}

      <form
        action={createGrant}
        style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 12, alignItems: "end" }}
      >
        <input type="hidden" name="eventId" value={event.id} />
        <input type="hidden" name="startsAtMs" />
        <input type="hidden" name="expiresAtMs" />
        <div className="form-row" style={{ marginBottom: 0, flex: "1 1 160px" }}>
          <label htmlFor="clientName">Client name</label>
          <input id="clientName" name="clientName" required style={{ width: "100%" }} />
        </div>
        <div className="form-row" style={{ marginBottom: 0, flex: "1.3 1 200px" }}>
          <label htmlFor="clientEmail">Client&apos;s Google email</label>
          <input id="clientEmail" name="clientEmail" type="email" required style={{ width: "100%" }} />
        </div>
        <ExpiryInput />
        <SubmitButton className="btn btn-primary" pendingLabel="Generating...">
          Generate event link
        </SubmitButton>
      </form>
      <p style={{ color: "var(--muted)", fontSize: ".82rem", marginBottom: 32 }}>
        We&apos;ll grant this exact Google account view access to the event folder on Drive &mdash;
        revoking or letting the link expire removes that access automatically.
      </p>

      <div className="songtable-wrap">
        <table>
          <thead>
            <tr>
              <th>Client</th>
              <th>Email</th>
              <th>Link</th>
              <th>Starts</th>
              <th>Expires</th>
              <th>Status</th>
              <th>Views</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {grants.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="emptystate">No access links yet for this event.</div>
                </td>
              </tr>
            ) : (
              grants.map((g) => {
                const expired = g.expiresAt < now;
                const notStartedYet = g.startsAt > now;
                const status = g.revoked
                  ? "Revoked"
                  : expired
                    ? "Expired"
                    : notStartedYet
                      ? "Scheduled"
                      : "Active";
                const statusColor =
                  status === "Active" ? "var(--good)" : status === "Scheduled" ? "var(--accent-warm)" : "var(--muted)";
                const link = `${baseUrl}/watch/${g.token}`;
                return (
                  <tr key={g.id}>
                    <td>{g.clientName}</td>
                    <td style={{ fontSize: ".82rem", color: "var(--muted)" }}>{g.clientEmail}</td>
                    <td style={{ fontSize: ".8rem", maxWidth: 160 }}>
                      {status === "Active" ? (
                        <a
                          href={link}
                          target="_blank"
                          rel="noopener"
                          title={link}
                          style={{
                            color: "var(--accent)",
                            display: "block",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          /watch/{g.token}
                        </a>
                      ) : (
                        <span
                          title={link}
                          style={{
                            color: "var(--muted)",
                            display: "block",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          /watch/{g.token}
                        </span>
                      )}
                    </td>
                    <td style={{ fontSize: ".82rem", color: "var(--muted)" }}>
                      <LocalTime ms={g.startsAt} />
                    </td>
                    <td style={{ fontSize: ".82rem", color: "var(--muted)" }}>
                      <LocalTime ms={g.expiresAt} />
                    </td>
                    <td style={{ fontSize: ".82rem", fontWeight: 700, color: statusColor }}>{status}</td>
                    <td style={{ fontSize: ".82rem" }}>
                      {(() => {
                        const stats = viewStatsByGrant.get(g.id) ?? { count: 0, distinctIps: 0 };
                        if (stats.count === 0) {
                          return <span style={{ color: "var(--muted)" }}>Not viewed</span>;
                        }
                        return (
                          <Link
                            href={`/admin/events/${event.id}/grants/${g.id}/views`}
                            style={{ color: stats.distinctIps > 1 ? "#B02A37" : "var(--muted)", fontWeight: stats.distinctIps > 1 ? 700 : 400 }}
                          >
                            {stats.count} view{stats.count === 1 ? "" : "s"}
                            {stats.distinctIps > 1 ? ` ⚠ ${stats.distinctIps} devices` : ""}
                          </Link>
                        );
                      })()}
                    </td>
                    <td>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                        {!g.revoked && <ExtendControl grantId={g.id} eventId={event.id} />}
                        {!g.revoked && !expired && (
                          <form action={revokeGrant} style={{ display: "inline" }}>
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
                        {(g.revoked || expired) && (
                          <form action={deleteGrant} style={{ display: "inline" }}>
                            <input type="hidden" name="id" value={g.id} />
                            <input type="hidden" name="eventId" value={event.id} />
                            <button
                              type="submit"
                              style={{ background: "none", border: "none", color: "#B02A37", cursor: "pointer", fontWeight: 700 }}
                            >
                              Delete
                            </button>
                          </form>
                        )}
                      </div>
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
