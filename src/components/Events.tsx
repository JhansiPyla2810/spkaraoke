"use client";

import { useLang } from "@/lib/LangProvider";
import Reveal from "./Reveal";

export default function Events() {
  const { t } = useLang();
  return (
    <section id="events">
      <div className="wrap">
        <Reveal className="events-card">
          <div>
            <span className="eyebrow">{t.eventsEyebrow}</span>
            <h3>{t.eventsH3}</h3>
            <p>{t.eventsP}</p>
            <div className="event-tags">
              <span className="lang-pill">{t.eventsTag1}</span>
              <span className="lang-pill">{t.eventsTag2}</span>
              <span className="lang-pill">{t.eventsTag3}</span>
            </div>
          </div>
          <div>
            <a className="btn btn-primary" href="#contact" style={{ width: "100%", display: "block", textAlign: "center" }}>
              {t.eventsCta}
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
