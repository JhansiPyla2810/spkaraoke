import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { isAuthed } from "@/lib/auth";
import { db } from "@/lib/db";
import { accessGrants } from "@/lib/schema";
import { getGrantViews, summarizeUserAgent } from "@/lib/accessViews";
import LocalTime from "@/app/components/LocalTime";

export default async function GrantViewsPage({
  params,
}: {
  params: Promise<{ id: string; grantId: string }>;
}) {
  if (!(await isAuthed())) redirect("/admin");

  const { id, grantId } = await params;
  const eventId = Number(id);
  const [grant] = await db.select().from(accessGrants).where(eq(accessGrants.id, Number(grantId)));
  if (!grant || grant.eventId !== eventId) notFound();

  const views = await getGrantViews(grant.id);
  const distinctIps = new Set(views.map((v) => v.ip));

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 16px 80px" }}>
      <p style={{ fontSize: ".82rem", marginBottom: 8 }}>
        <Link href={`/admin/events/${eventId}`} style={{ color: "var(--muted)", textDecoration: "none" }}>
          ← {grant.clientName}&apos;s link
        </Link>
      </p>
      <h1 style={{ fontFamily: "Archivo, sans-serif", fontSize: "1.5rem", marginBottom: 10 }}>
        Views for {grant.clientName}
      </h1>
      <p style={{ color: "var(--muted)", fontSize: ".88rem", marginBottom: 24 }}>
        {views.length} view{views.length === 1 ? "" : "s"} from {distinctIps.size} distinct IP
        {distinctIps.size === 1 ? "" : "es"}.
        {distinctIps.size > 1 && (
          <span style={{ color: "#B02A37", fontWeight: 700 }}>
            {" "}
            This link has been opened from more than one location — it may have been shared beyond
            the intended client.
          </span>
        )}
      </p>

      <div className="songtable-wrap">
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>IP address</th>
              <th>Device</th>
            </tr>
          </thead>
          <tbody>
            {views.length === 0 ? (
              <tr>
                <td colSpan={3}>
                  <div className="emptystate">No views yet.</div>
                </td>
              </tr>
            ) : (
              views.map((v) => (
                <tr key={v.id}>
                  <td style={{ fontSize: ".85rem" }}>
                    <LocalTime ms={v.viewedAt} />
                  </td>
                  <td style={{ fontSize: ".85rem", fontFamily: "monospace", color: "var(--muted)" }}>{v.ip}</td>
                  <td style={{ fontSize: ".85rem" }}>{summarizeUserAgent(v.userAgent)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
