"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/lib/LangProvider";

const SECTIONS = ["home", "about", "songs", "events", "contact"] as const;

export default function Nav() {
  const { lang, setLang, t } = useLang();
  const [active, setActive] = useState<string>("home");

  useEffect(() => {
    function updateActive() {
      const probe = window.scrollY + window.innerHeight * 0.3;
      let current: (typeof SECTIONS)[number] = SECTIONS[0];
      for (const id of SECTIONS) {
        const el = document.getElementById(id);
        if (el && el.offsetTop <= probe) current = id;
      }
      setActive(current);
    }
    let ticking = false;
    function onScroll() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(() => {
          updateActive();
          ticking = false;
        });
      }
    }
    updateActive();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav>
      <div className="navrow">
        <div className="brand">
          <span className="logo-mark" aria-hidden="true">
            <svg className="disc" viewBox="0 0 32 32">
              <circle cx="16" cy="16" r="15" fill="#15171A" />
              <circle className="groove" cx="16" cy="16" r="12" fill="none" stroke="#FFFFFF" strokeWidth={1} />
              <circle className="groove" cx="16" cy="16" r="9" fill="none" stroke="#FFFFFF" strokeWidth={1} />
              <circle className="groove" cx="16" cy="16" r="6" fill="none" stroke="#FFFFFF" strokeWidth={1} />
              <circle cx="16" cy="16" r="2.6" fill="#3D6E77" />
            </svg>
            <span className="ping" />
            <span className="badge">
              <svg viewBox="0 0 24 24" fill="none">
                <circle cx="7" cy="18" r="3.2" fill="#FFFFFF" />
                <circle cx="16" cy="16" r="3.2" fill="#FFFFFF" />
                <rect x="9" y="4" width="1.8" height="14.5" fill="#FFFFFF" />
                <rect x="17.8" y="3" width="1.8" height="13" fill="#FFFFFF" />
                <path d="M9 4 L19.6 3 L19.6 6.5 L9 7.5 Z" fill="#FFFFFF" />
              </svg>
            </span>
          </span>
          SatyaPylaKaraoke
        </div>
        <div className="navlinks">
          <a href="#home" className={active === "home" ? "active" : ""}>{t.navHome}</a>
          <a href="#about" className={active === "about" ? "active" : ""}>{t.navAbout}</a>
          <a href="#songs" className={active === "songs" ? "active" : ""}>{t.navSongs}</a>
          <a href="#events" className={active === "events" ? "active" : ""}>{t.navEvents}</a>
          <a href="#contact" className={active === "contact" ? "active" : ""}>{t.navContact}</a>
        </div>
        <div className="navactions">
          <div className="lang-toggle" role="group" aria-label="Language">
            <button type="button" className={lang === "en" ? "active" : ""} onClick={() => setLang("en")}>EN</button>
            <button type="button" className={lang === "te" ? "active" : ""} onClick={() => setLang("te")}>తె</button>
          </div>
          <a className="navcta" href="#contact">{t.navGetAccess}</a>
        </div>
      </div>
    </nav>
  );
}
