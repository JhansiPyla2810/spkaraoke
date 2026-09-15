import { db } from "./db";
import { songs } from "./schema";
import { slugify } from "./slug";

export const MIN_SONGS_FOR_PAGE = 3;

export async function getAllHeroesWithCounts() {
  const rows = await db.select({ hero: songs.hero }).from(songs);
  const counts = new Map<string, number>();
  for (const r of rows) {
    const hero = r.hero?.trim();
    if (!hero) continue;
    counts.set(hero, (counts.get(hero) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([hero, count]) => ({ hero, slug: slugify(hero), count }))
    .sort((a, b) => b.count - a.count || a.hero.localeCompare(b.hero));
}

export async function getHeroBySlug(slug: string) {
  const heroes = await getAllHeroesWithCounts();
  return heroes.find((h) => h.slug === slug) ?? null;
}

export async function getSongsForHero(heroName: string) {
  const rows = await db
    .select({ id: songs.id, title: songs.title, movie: songs.movie, hero: songs.hero })
    .from(songs);
  return rows.filter((r) => r.hero?.trim() === heroName).sort((a, b) => a.title.localeCompare(b.title));
}
