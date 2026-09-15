import type { Metadata } from "next";
import Link from "next/link";
import { getAllMoviesWithCounts, MIN_SONGS_FOR_PAGE } from "@/lib/movies";

export const metadata: Metadata = {
  title: "Telugu Karaoke Tracks by Movie — Full Catalog | SatyaPylaKaraoke",
  description:
    "Browse 5,000+ Telugu karaoke tracks organized by movie. Find karaoke versions of your favorite Telugu film songs, vocals removed, ready to sing.",
  alternates: { canonical: "/songs" },
};

export const revalidate = 3600;

export default async function SongsHubPage() {
  const movies = await getAllMoviesWithCounts();

  return (
    <div className="wrap" style={{ padding: "56px 24px 80px" }}>
      <span className="eyebrow">The full catalog</span>
      <h1 style={{ fontSize: "clamp(1.8rem,3.5vw,2.6rem)", marginTop: 10 }}>
        Telugu karaoke tracks, browsed by movie
      </h1>
      <p style={{ color: "var(--muted)", marginTop: 14, maxWidth: "62ch" }}>
        Every Telugu karaoke track in our library, grouped by film. Movies with a full page get
        their own track listing below — for the rest, search the{" "}
        <Link href="/#songs" style={{ color: "var(--accent)", fontWeight: 700 }}>
          full catalog on the homepage
        </Link>
        .
      </p>
      <p style={{ marginTop: 10 }}>
        <Link href="/singers" style={{ color: "var(--accent)", fontWeight: 700, textDecoration: "none" }}>
          Browse by original singer instead →
        </Link>
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 12,
          marginTop: 32,
        }}
      >
        {movies.map((m) => {
          const hasPage = m.count >= MIN_SONGS_FOR_PAGE;
          const card = (
            <>
              <div style={{ fontWeight: 700, fontFamily: "Fraunces, Georgia, serif" }}>{m.movie}</div>
              <div style={{ color: "var(--muted)", fontSize: ".82rem", marginTop: 4 }}>
                {m.count} karaoke track{m.count === 1 ? "" : "s"}
              </div>
            </>
          );
          const style: React.CSSProperties = {
            display: "block",
            padding: "16px 18px",
            border: "1px solid var(--line)",
            borderRadius: 10,
            background: hasPage ? "var(--surface)" : "var(--surface2)",
            textDecoration: "none",
            color: "var(--ink)",
            opacity: hasPage ? 1 : 0.75,
          };
          return hasPage ? (
            <Link key={m.slug} href={`/songs/${m.slug}`} style={style}>
              {card}
            </Link>
          ) : (
            <div key={m.slug} style={style}>
              {card}
            </div>
          );
        })}
      </div>

      <p style={{ marginTop: 40 }}>
        <Link href="/" style={{ color: "var(--accent)", fontWeight: 700, textDecoration: "none" }}>
          ← Back to SatyaPylaKaraoke home
        </Link>
      </p>
    </div>
  );
}
