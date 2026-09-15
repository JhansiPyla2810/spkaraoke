import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllHeroesWithCounts, getHeroBySlug, getSongsForHero, MIN_SONGS_FOR_PAGE } from "@/lib/heroes";

export const revalidate = 3600;

export async function generateStaticParams() {
  const heroes = await getAllHeroesWithCounts();
  return heroes.filter((h) => h.count >= MIN_SONGS_FOR_PAGE).map((h) => ({ hero: h.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ hero: string }>;
}): Promise<Metadata> {
  const { hero: slug } = await params;
  const hero = await getHeroBySlug(slug);
  if (!hero || hero.count < MIN_SONGS_FOR_PAGE) return {};
  return {
    title: `${hero.hero} Telugu Karaoke Tracks (${hero.count} songs) | SatyaPylaKaraoke`,
    description: `Telugu karaoke tracks featuring ${hero.hero} — ${hero.count} karaoke tracks, vocals removed, pitch true to the original, ready to sing.`,
    alternates: { canonical: `/singers/${hero.slug}` },
  };
}

export default async function HeroPage({ params }: { params: Promise<{ hero: string }> }) {
  const { hero: slug } = await params;
  const hero = await getHeroBySlug(slug);
  if (!hero || hero.count < MIN_SONGS_FOR_PAGE) notFound();

  const songList = await getSongsForHero(hero.hero);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MusicPlaylist",
    name: `${hero.hero} — Telugu Karaoke Tracks`,
    description: `Karaoke tracks from Telugu movies starring ${hero.hero}`,
    numTracks: songList.length,
    track: songList.map((s) => ({ "@type": "MusicRecording", name: s.title })),
  };

  return (
    <div className="wrap" style={{ padding: "56px 24px 80px" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p style={{ fontSize: ".82rem" }}>
        <Link href="/singers" style={{ color: "var(--muted)", textDecoration: "none" }}>
          The catalog
        </Link>{" "}
        <span style={{ color: "var(--muted)" }}>/</span> {hero.hero}
      </p>
      <span className="eyebrow">Telugu karaoke tracks</span>
      <h1 style={{ fontSize: "clamp(1.8rem,3.5vw,2.6rem)", marginTop: 10 }}>
        {hero.hero} <span style={{ color: "var(--muted)", fontWeight: 400 }}>karaoke tracks</span>
      </h1>
      <p style={{ color: "var(--muted)", marginTop: 14, maxWidth: "62ch" }}>
        {hero.count} karaoke tracks from Telugu movies starring {hero.hero}, hand-mixed — vocals
        stripped clean, pitch true to the original, lyrics timed to the beat.
      </p>

      <div className="songtable-wrap" style={{ marginTop: 32 }}>
        <table>
          <thead>
            <tr>
              <th>Song</th>
              <th>Movie</th>
            </tr>
          </thead>
          <tbody>
            {songList.map((s) => (
              <tr key={s.id}>
                <td>{s.title}</td>
                <td>{s.movie}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ marginTop: 24 }}>
        Don&apos;t see the song you&apos;re looking for?{" "}
        <Link href="/#contact" style={{ color: "var(--accent)", fontWeight: 700, textDecoration: "none" }}>
          Contact us
        </Link>{" "}
        and we&apos;ll take the request directly.
      </p>

      <p style={{ marginTop: 24 }}>
        <Link href="/singers" style={{ color: "var(--accent)", fontWeight: 700, textDecoration: "none" }}>
          ← Browse all heroes
        </Link>
      </p>
    </div>
  );
}
