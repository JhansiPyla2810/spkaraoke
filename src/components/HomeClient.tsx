"use client";

import { LangProvider } from "@/lib/LangProvider";
import Nav from "./Nav";
import Hero from "./Hero";
import About from "./About";
import Songs, { type Song } from "./Songs";
import Events from "./Events";
import Contact from "./Contact";
import FooterAndLegends from "./FooterAndLegends";

export default function HomeClient({ songs, totalCount }: { songs: Song[]; totalCount: number }) {
  return (
    <LangProvider>
      <Nav />
      <Hero />
      <About />
      <Songs songs={songs} totalCount={totalCount} />
      <Events />
      <Contact />
      <FooterAndLegends />
    </LangProvider>
  );
}
