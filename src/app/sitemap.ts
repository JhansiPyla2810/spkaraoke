import type { MetadataRoute } from "next";
import { getAllMoviesWithCounts, MIN_SONGS_FOR_PAGE } from "@/lib/movies";
import { getAllHeroesWithCounts } from "@/lib/heroes";

const BASE_URL = "https://spkaraoke.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [movies, heroes] = await Promise.all([getAllMoviesWithCounts(), getAllHeroesWithCounts()]);

  return [
    { url: `${BASE_URL}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE_URL}/songs`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE_URL}/singers`, changeFrequency: "weekly", priority: 0.9 },
    ...movies
      .filter((m) => m.count >= MIN_SONGS_FOR_PAGE)
      .map((m) => ({
        url: `${BASE_URL}/songs/${m.slug}`,
        changeFrequency: "monthly" as const,
        priority: 0.7,
      })),
    ...heroes
      .filter((h) => h.count >= MIN_SONGS_FOR_PAGE)
      .map((h) => ({
        url: `${BASE_URL}/singers/${h.slug}`,
        changeFrequency: "monthly" as const,
        priority: 0.7,
      })),
  ];
}
