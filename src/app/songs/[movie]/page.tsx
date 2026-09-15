import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllMoviesWithCounts, getMovieBySlug, getSongsForMovie, MIN_SONGS_FOR_PAGE } from "@/lib/movies";

export const revalidate = 3600;

export async function generateStaticParams() {
  const movies = await getAllMoviesWithCounts();
  return movies.filter((m) => m.count >= MIN_SONGS_FOR_PAGE).map((m) => ({ movie: m.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ movie: string }>;
}): Promise<Metadata> {
  const { movie: slug } = await params;
  const movie = await getMovieBySlug(slug);
  if (!movie || movie.count < MIN_SONGS_FOR_PAGE) return {};
  return {
    title: `${movie.movie} Telugu Karaoke Tracks (${movie.count} song${movie.count === 1 ? "" : "s"}) | SatyaPylaKaraoke`,
    description: `Karaoke tracks for ${movie.movie} — ${movie.count} Telugu karaoke track${movie.count === 1 ? "" : "s"} from the movie, vocals removed, pitch true to the original, ready to sing.`,
    alternates: { canonical: `/songs/${movie.slug}` },
  };
}

export default async function MoviePage({ params }: { params: Promise<{ movie: string }> }) {
  const { movie: slug } = await params;
  const movie = await getMovieBySlug(slug);
  if (!movie || movie.count < MIN_SONGS_FOR_PAGE) notFound();

  const songList = await getSongsForMovie(movie.movie);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MusicPlaylist",
    name: `${movie.movie} — Telugu Karaoke Tracks`,
    description: `Karaoke tracks for the Telugu movie ${movie.movie}`,
    numTracks: songList.length,
    track: songList.map((s) => ({ "@type": "MusicRecording", name: s.title, byArtist: s.hero || undefined })),
  };

  return (
    <div className="wrap" style={{ padding: "56px 24px 80px" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p style={{ fontSize: ".82rem" }}>
        <Link href="/songs" style={{ color: "var(--muted)", textDecoration: "none" }}>
          The catalog
        </Link>{" "}
        <span style={{ color: "var(--muted)" }}>/</span> {movie.movie}
      </p>
      <span className="eyebrow">Telugu karaoke tracks</span>
      <h1 style={{ fontSize: "clamp(1.8rem,3.5vw,2.6rem)", marginTop: 10 }}>
        {movie.movie} <span style={{ color: "var(--muted)", fontWeight: 400 }}>karaoke tracks</span>
      </h1>
      <p style={{ color: "var(--muted)", marginTop: 14, maxWidth: "62ch" }}>
        {movie.count} karaoke track{movie.count === 1 ? "" : "s"} from {movie.movie}, hand-mixed —
        vocals stripped clean, pitch true to the original, lyrics timed to the beat.
      </p>

      <div className="songtable-wrap" style={{ marginTop: 32 }}>
        <table>
          <thead>
            <tr>
              <th>Song</th>
              <th>Hero</th>
            </tr>
          </thead>
          <tbody>
            {songList.map((s) => (
              <tr key={s.id}>
                <td>{s.title}</td>
                <td>{s.hero}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ marginTop: 24 }}>
        Don&apos;t see the song you&apos;re looking for from {movie.movie}?{" "}
        <Link href="/#contact" style={{ color: "var(--accent)", fontWeight: 700, textDecoration: "none" }}>
          Contact us
        </Link>{" "}
        and we&apos;ll take the request directly.
      </p>

      <p style={{ marginTop: 24 }}>
        <Link href="/songs" style={{ color: "var(--accent)", fontWeight: 700, textDecoration: "none" }}>
          ← Browse all movies
        </Link>
      </p>
    </div>
  );
}
