"use client";

import { LangProvider } from "@/lib/LangProvider";
import Nav from "./Nav";
import Hero from "./Hero";
import About from "./About";
import Events from "./Events";
import Contact from "./Contact";
import FooterAndLegends from "./FooterAndLegends";

export default function HomeClient({
  isApp = false,
  signedIn = false,
  sessionToken,
}: {
  isApp?: boolean;
  signedIn?: boolean;
  sessionToken?: string;
}) {
  return (
    <LangProvider>
      <Nav isApp={isApp} signedIn={signedIn} sessionToken={sessionToken} />
      <Hero isApp={isApp} />
      <About />
      <Events />
      <Contact />
      <FooterAndLegends />
    </LangProvider>
  );
}
