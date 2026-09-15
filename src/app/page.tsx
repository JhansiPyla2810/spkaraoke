import { db } from "@/lib/db";
import { songs } from "@/lib/schema";
import { asc } from "drizzle-orm";
import HomeClient from "@/components/HomeClient";

export const revalidate = 0;

export default async function Home() {
  const rows = await db
    .select({ id: songs.id, title: songs.title, movie: songs.movie, hero: songs.hero })
    .from(songs)
    .orderBy(asc(songs.title));

  return <HomeClient songs={rows} totalCount={rows.length} />;
}
