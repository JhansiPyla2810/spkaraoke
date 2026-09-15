import { redirect } from "next/navigation";
import { desc } from "drizzle-orm";
import { isAuthed } from "@/lib/auth";
import { db } from "@/lib/db";
import { songs } from "@/lib/schema";
import { addSong, deleteSong, logout } from "../actions";

export default async function DashboardPage() {
  if (!(await isAuthed())) redirect("/admin");

  const allSongs = await db.select().from(songs).orderBy(desc(songs.id));

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px 80px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <h1 style={{ fontFamily: "Archivo, sans-serif", fontSize: "1.5rem" }}>
          Songs ({allSongs.length})
        </h1>
        <form action={logout}>
          <button className="btn btn-ghost" type="submit">Log out</button>
        </form>
      </div>

      <form
        action={addSong}
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 10, marginBottom: 32, alignItems: "end" }}
      >
        <div className="form-row" style={{ marginBottom: 0 }}>
          <label htmlFor="title">Title</label>
          <input id="title" name="title" required />
        </div>
        <div className="form-row" style={{ marginBottom: 0 }}>
          <label htmlFor="movie">Movie</label>
          <input id="movie" name="movie" />
        </div>
        <div className="form-row" style={{ marginBottom: 0 }}>
          <label htmlFor="hero">Hero</label>
          <input id="hero" name="hero" />
        </div>
        <input type="hidden" name="language" value="Telugu" />
        <button className="btn btn-primary" type="submit">Add song</button>
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
                    <button
                      type="submit"
                      style={{ background: "none", border: "none", color: "#B02A37", cursor: "pointer", fontWeight: 700 }}
                    >
                      Delete
                    </button>
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
