import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { isAuthed } from "@/lib/auth";
import { db } from "@/lib/db";
import { subscribers, subscriptions } from "@/lib/schema";
import { getSubscriptionStatus, PLAN_DURATION_DAYS } from "@/lib/subscriptions";
import {
  createSubscriber,
  deleteSubscriber,
  createSubscription,
  extendSubscription,
  suspendSubscription,
  reactivateSubscription,
  revokeSubscription,
} from "./actions";
import { logout } from "../actions";
import SubmitButton from "@/app/components/SubmitButton";
import LocalTime from "@/app/components/LocalTime";

export default async function SubscriptionsPage() {
  if (!(await isAuthed())) redirect("/admin");

  const allSubscribers = await db.select().from(subscribers).orderBy(desc(subscribers.id));
  const rows = await Promise.all(
    allSubscribers.map(async (s) => {
      const status = await getSubscriptionStatus(s.id);
      const [latestSub] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.subscriberId, s.id))
        .orderBy(desc(subscriptions.id));
      return { subscriber: s, status, latestSub };
    })
  );

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 16px 80px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 28,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <h1 style={{ fontFamily: "Archivo, sans-serif", fontSize: "1.5rem" }}>
          Subscribers ({allSubscribers.length})
        </h1>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link className="btn btn-ghost" href="/admin/events">Events &amp; links</Link>
          <form action={logout}>
            <SubmitButton className="btn btn-ghost" pendingLabel="Logging out...">Log out</SubmitButton>
          </form>
        </div>
      </div>

      <form
        action={createSubscriber}
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 32,
          padding: 18,
          borderRadius: 12,
          background: "var(--surface)",
          border: "1px solid var(--line)",
        }}
      >
        <input
          name="email"
          type="email"
          placeholder="client@gmail.com"
          required
          style={{
            flex: "1 1 220px",
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid var(--line)",
            background: "var(--bg)",
            color: "var(--ink)",
          }}
        />
        <input
          name="name"
          type="text"
          placeholder="Name (optional)"
          style={{
            flex: "1 1 160px",
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid var(--line)",
            background: "var(--bg)",
            color: "var(--ink)",
          }}
        />
        <SubmitButton className="btn btn-primary" pendingLabel="Adding...">
          Add subscriber
        </SubmitButton>
      </form>

      <div className="songtable-wrap">
        <table>
          <thead>
            <tr>
              <th>Email</th>
              <th>Name</th>
              <th>Status</th>
              <th>Expires</th>
              <th>Plan</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className="emptystate">No subscribers yet.</div>
                </td>
              </tr>
            ) : (
              rows.map(({ subscriber, status, latestSub }) => (
                <tr key={subscriber.id}>
                  <td style={{ fontSize: ".85rem" }}>{subscriber.email}</td>
                  <td style={{ fontSize: ".85rem", color: "var(--muted)" }}>{subscriber.name}</td>
                  <td
                    style={{
                      fontSize: ".82rem",
                      fontWeight: 700,
                      color: status.active ? "var(--good)" : "var(--muted)",
                    }}
                  >
                    {status.active ? "Active" : status.reason === "none" ? "No subscription" : status.reason}
                  </td>
                  <td style={{ fontSize: ".82rem", color: "var(--muted)" }}>
                    {latestSub ? <LocalTime ms={latestSub.expiresAt} /> : "—"}
                  </td>
                  <td style={{ fontSize: ".82rem", color: "var(--muted)" }}>
                    {latestSub?.plan ?? "—"}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                      <form action={createSubscription}>
                        <input type="hidden" name="subscriberId" value={subscriber.id} />
                        <select
                          name="plan"
                          style={{
                            padding: "6px 8px",
                            borderRadius: 6,
                            border: "1px solid var(--line)",
                            background: "var(--bg)",
                            color: "var(--ink)",
                            fontSize: ".78rem",
                          }}
                        >
                          {Object.keys(PLAN_DURATION_DAYS).map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                        <SubmitButton className="btn btn-ghost" pendingLabel="..." style={{ fontSize: ".78rem", padding: "6px 10px" }}>
                          {latestSub ? "Renew" : "Activate"}
                        </SubmitButton>
                      </form>

                      {latestSub && !latestSub.revoked && (
                        <>
                          <form action={extendSubscription} style={{ display: "flex", gap: 4 }}>
                            <input type="hidden" name="id" value={latestSub.id} />
                            <input type="hidden" name="days" value="7" />
                            <SubmitButton className="btn btn-ghost" pendingLabel="..." style={{ fontSize: ".78rem", padding: "6px 10px" }}>
                              +7 days
                            </SubmitButton>
                          </form>
                          {latestSub.suspended ? (
                            <form action={reactivateSubscription}>
                              <input type="hidden" name="id" value={latestSub.id} />
                              <SubmitButton className="btn btn-ghost" pendingLabel="..." style={{ fontSize: ".78rem", padding: "6px 10px" }}>
                                Reactivate
                              </SubmitButton>
                            </form>
                          ) : (
                            <form action={suspendSubscription}>
                              <input type="hidden" name="id" value={latestSub.id} />
                              <SubmitButton className="btn btn-ghost" pendingLabel="..." style={{ fontSize: ".78rem", padding: "6px 10px" }}>
                                Suspend
                              </SubmitButton>
                            </form>
                          )}
                          <form action={revokeSubscription}>
                            <input type="hidden" name="id" value={latestSub.id} />
                            <SubmitButton className="btn btn-ghost" pendingLabel="..." style={{ fontSize: ".78rem", padding: "6px 10px", color: "#B02A37" }}>
                              Revoke
                            </SubmitButton>
                          </form>
                        </>
                      )}

                      <form action={deleteSubscriber}>
                        <input type="hidden" name="id" value={subscriber.id} />
                        <SubmitButton className="btn btn-ghost" pendingLabel="..." style={{ fontSize: ".78rem", padding: "6px 10px", color: "#B02A37" }}>
                          Delete
                        </SubmitButton>
                      </form>
                    </div>
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
