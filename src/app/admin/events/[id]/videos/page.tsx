import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { isAuthed } from "@/lib/auth";
import { db } from "@/lib/db";
import { events } from "@/lib/schema";
import { getDriveConnectionStatus, getAccessTokenFromRefreshToken } from "@/lib/googleAuth";
import { listFolderFiles } from "@/lib/drive";
import VideoManager from "./VideoManager";

export const dynamic = "force-dynamic";

export default async function EventVideosPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed())) redirect("/admin");

  const { id } = await params;
  const eventId = Number(id);
  const [event] = await db.select().from(events).where(eq(events.id, eventId));
  if (!event) notFound();

  const driveStatus = await getDriveConnectionStatus();
  const connected = driveStatus === "ok";

  let files: { id: string; name: string; mimeType: string; size?: string }[] = [];
  let loadError = false;
  if (connected) {
    try {
      const accessToken = await getAccessTokenFromRefreshToken();
      files = await listFolderFiles(event.driveFolderId, accessToken);
    } catch {
      loadError = true;
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 16px 80px" }}>
      <p style={{ fontSize: ".82rem", marginBottom: 8 }}>
        <Link href={`/admin/events/${event.id}`} style={{ color: "var(--muted)", textDecoration: "none" }}>
          ← {event.name}
        </Link>
      </p>
      <h1 style={{ fontFamily: "Archivo, sans-serif", fontSize: "1.5rem", marginBottom: 20 }}>
        Manage videos — {event.name}
      </h1>

      {driveStatus === "expired" && (
        <p style={{ color: "#B02A37", fontWeight: 700, fontSize: ".85rem" }}>
          ⚠ Google Drive connection has expired —{" "}
          <Link href="/admin/events" style={{ color: "#B02A37", textDecoration: "underline" }}>
            reconnect it
          </Link>{" "}
          before continuing.
        </p>
      )}
      {driveStatus === "none" && (
        <p style={{ color: "var(--muted)", fontSize: ".85rem" }}>
          <Link href="/admin/events" style={{ color: "var(--accent)", fontWeight: 700 }}>
            Connect Google Drive
          </Link>{" "}
          first to upload, rename, or delete videos here.
        </p>
      )}

      {connected && loadError && (
        <p style={{ color: "#B02A37", fontSize: ".9rem" }}>
          Couldn&apos;t load this folder&apos;s files. Try reconnecting Google Drive.
        </p>
      )}

      {connected && !loadError && <VideoManager eventId={event.id} files={files} />}
    </div>
  );
}
