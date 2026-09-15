import { db } from "./db";
import { songs } from "./schema";
import { slugify } from "./slug";

// Below this, a movie has too few tracks to justify its own indexable page —
// a page with one row reads as thin content to search engines.
export const MIN_SONGS_FOR_PAGE = 3;

export async function getAllMoviesWithCounts() {
  const rows = await db.select({ movie: songs.movie }).from(songs);
  const counts = new Map<string, number>();
  for (const r of rows) {
    const movie = r.movie?.trim();
    if (!movie) continue;
    counts.set(movie, (counts.get(movie) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([movie, count]) => ({ movie, slug: slugify(movie), count }))
    .sort((a, b) => a.movie.localeCompare(b.movie));
}

export async function getMovieBySlug(slug: string) {
  const movies = await getAllMoviesWithCounts();
  return movies.find((m) => m.slug === slug) ?? null;
}

export async function getSongsForMovie(movieName: string) {
  const rows = await db
    .select({ id: songs.id, title: songs.title, movie: songs.movie, hero: songs.hero })
    .from(songs);
  return rows.filter((r) => r.movie?.trim() === movieName).sort((a, b) => a.title.localeCompare(b.title));
}
