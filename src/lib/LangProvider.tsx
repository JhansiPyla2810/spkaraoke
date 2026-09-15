"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { TRANSLATIONS, type Lang } from "./translations";

type LangContextValue = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (typeof TRANSLATIONS)["en"];
};

const LangContext = createContext<LangContextValue | null>(null);

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => {
    document.body.classList.toggle("lang-te", lang === "te");
    document.body.setAttribute("lang", lang);
  }, [lang]);

  const value: LangContextValue = { lang, setLang, t: TRANSLATIONS[lang] };
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used within LangProvider");
  return ctx;
}
