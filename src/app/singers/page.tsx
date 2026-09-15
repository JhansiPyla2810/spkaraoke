import type { Metadata } from "next";
import Link from "next/link";
import { getAllHeroesWithCounts, MIN_SONGS_FOR_PAGE } from "@/lib/heroes";

export const metadata: Metadata = {
  title: "Telugu Karaoke Tracks by Singer & Hero — Full Catalog | SPKaraoke",
  description:
    "Browse Telugu karaoke tracks by original hero and singer — NTR, Chiranjeevi, ANR, Nagarjuna and more, vocals removed, ready to sing.",
  alternates: { canonical: "/singers" },
};

export const revalidate = 3600;

export default async function SingersHubPage() {
  const heroes = await getAllHeroesWithCounts();

  return (
    <div className="wrap" style={{ padding: "56px 24px 80px" }}>
      <span className="eyebrow">The full catalog</span>
      <h1 style={{ fontSize: "clamp(1.8rem,3.5vw,2.6rem)", marginTop: 10 }}>
        Telugu karaoke tracks, browsed by hero
      </h1>
      <p style={{ color: "var(--muted)", marginTop: 14, maxWidth: "62ch" }}>
        Every Telugu karaoke track in our library, grouped by the film&apos;s original hero.
      </p>
      <p style={{ marginTop: 10 }}>
        <Link href="/songs" style={{ color: "var(--accent)", fontWeight: 700, textDecoration: "none" }}>
          Browse by movie instead →
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
        {heroes.map((h) => {
          const hasPage = h.count >= MIN_SONGS_FOR_PAGE;
          const card = (
            <>
              <div style={{ fontWeight: 700, fontFamily: "Fraunces, Georgia, serif" }}>{h.hero}</div>
              <div style={{ color: "var(--muted)", fontSize: ".82rem", marginTop: 4 }}>
                {h.count} karaoke track{h.count === 1 ? "" : "s"}
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
            <Link key={h.slug} href={`/singers/${h.slug}`} style={style}>
              {card}
            </Link>
          ) : (
            <div key={h.slug} style={style}>
              {card}
            </div>
          );
        })}
      </div>

      <p style={{ marginTop: 40 }}>
        <Link href="/" style={{ color: "var(--accent)", fontWeight: 700, textDecoration: "none" }}>
          ← Back to SPKaraoke home
        </Link>
      </p>
    </div>
  );
}
