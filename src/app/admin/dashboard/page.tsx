import Link from "next/link";
import { redirect } from "next/navigation";
import { desc } from "drizzle-orm";
import { isAuthed } from "@/lib/auth";
import { db } from "@/lib/db";
import { songs } from "@/lib/schema";
import { addSong, deleteSong, logout } from "../actions";
import SubmitButton from "@/app/components/SubmitButton";

export default async function DashboardPage() {
  if (!(await isAuthed())) redirect("/admin");

  const allSongs = await db.select().from(songs).orderBy(desc(songs.id));

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 16px 80px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28, flexWrap: "wrap", gap: 10 }}>
        <h1 style={{ fontFamily: "Archivo, sans-serif", fontSize: "1.5rem" }}>
          Songs ({allSongs.length})
        </h1>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link className="btn btn-ghost" href="/admin/events">Event access →</Link>
          <form action={logout}>
            <SubmitButton className="btn btn-ghost" pendingLabel="Logging out...">Log out</SubmitButton>
          </form>
        </div>
      </div>

      <form
        action={addSong}
        style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 32, alignItems: "end" }}
      >
        <div className="form-row" style={{ marginBottom: 0, flex: "1 1 140px" }}>
          <label htmlFor="title">Title</label>
          <input id="title" name="title" required style={{ width: "100%" }} />
        </div>
        <div className="form-row" style={{ marginBottom: 0, flex: "1 1 140px" }}>
          <label htmlFor="movie">Movie</label>
          <input id="movie" name="movie" style={{ width: "100%" }} />
        </div>
        <div className="form-row" style={{ marginBottom: 0, flex: "1 1 140px" }}>
          <label htmlFor="hero">Hero</label>
          <input id="hero" name="hero" style={{ width: "100%" }} />
        </div>
        <input type="hidden" name="language" value="Telugu" />
        <SubmitButton className="btn btn-primary" pendingLabel="Adding...">Add song</SubmitButton>
      </form>

      <div className="songtable-wrap">
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Movie</th>
              <th>Hero</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {allSongs.map((s) => (
              <tr key={s.id}>
                <td>{s.title}</td>
                <td>{s.movie}</td>
                <td>{s.hero}</td>
                <td>
                  <form action={deleteSong}>
                    <input type="hidden" name="id" value={s.id} />
                    <SubmitButton
                      pendingLabel="Deleting..."
                      style={{ background: "none", border: "none", color: "#B02A37", cursor: "pointer", fontWeight: 700 }}
                    >
                      Delete
                    </SubmitButton>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
