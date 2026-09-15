"use client";

import { useLang } from "@/lib/LangProvider";
import Reveal from "./Reveal";

export default function About() {
  const { t } = useLang();
  const steps = [
    [t.tstep1h, t.tstep1p],
    [t.tstep2h, t.tstep2p],
    [t.tstep3h, t.tstep3p],
    [t.tstep4h, t.tstep4p],
  ];
  return (
    <section id="about">
      <Reveal className="wrap about-grid">
        <div>
          <span className="eyebrow">{t.aboutEyebrow}</span>
          <h2 style={{ marginTop: 10 }}>{t.aboutH2}</h2>
          <p style={{ color: "var(--muted)", marginTop: 14 }}>{t.aboutP}</p>
          <div className="lang-cloud">
            <span className="lang-pill">{t.langTeluguPill} <b>5,000+</b></span>
            <span className="lang-pill">{t.langHindiPill} <b>1,000+</b></span>
          </div>
        </div>
        <div className="timeline">
          {steps.map(([h, p], i) => (
            <div className="tstep" key={i}>
              <div className="num">{i + 1}</div>
              <div>
                <h4>{h}</h4>
                <p>{p}</p>
              </div>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
