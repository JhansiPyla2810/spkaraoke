"use client";

import { useLang } from "@/lib/LangProvider";

export default function Hero() {
  const { t } = useLang();
  return (
    <section id="home" className="hero" style={{ borderTop: "none" }}>
      <div className="hero-inner wrap">
        <div>
          <span className="eyebrow">{t.heroEyebrow}</span>
          <h1>
            {t.heroH1a}
            <em>{t.heroH1em}</em>
            {t.heroH1b}
          </h1>
          <p>{t.heroP}</p>
          <div className="hero-actions">
            <a className="btn btn-primary" href="#songs">{t.heroBrowse}</a>
            <a className="btn btn-ghost" href="#contact">{t.heroAccess}</a>
          </div>
          <div className="stat-strip">
            <div className="stat"><b>5,000+</b><span>{t.statTelugu}</span></div>
            <div className="stat"><b>1,000+</b><span>{t.statHindi}</span></div>
            <div className="stat"><b>1,860</b><span>{t.statHrs}</span></div>
          </div>
        </div>
        <figure className="hero-photo">
          <img src="/assets/owner.jpg" alt="Founder of SPKaraoke on stage with a mic" />
          <figcaption>
            <b>Founder, SPKaraoke</b>
            <br />
            <span>{t.founderRole}</span>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
