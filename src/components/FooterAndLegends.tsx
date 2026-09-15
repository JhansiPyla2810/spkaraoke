"use client";

import { useLang } from "@/lib/LangProvider";

const LEGENDS: [string, string, string][] = [
  ["Ghantasala", "1922–1974", "ghantasala.jpg"],
  ["S. P. Balasubrahmanyam", "1946–2020", "spb.jpg"],
  ["P. Susheela", "b. 1935", "susheela.jpg"],
  ["S. Janaki", "b. 1938", "janaki.jpg"],
  ["Vani Jayaram", "1945–2023", "vanijayaram.jpg"],
  ["K. V. Mahadevan", "1918–2001", "mahadevan.jpg"],
  ["Bhanumathi Ramakrishna", "1925–2005", "bhanumathi.jpg"],
];

export default function FooterAndLegends() {
  const { t } = useLang();
  const cards = LEGENDS.map(([name, years, file]) => (
    <div className="legend-card" key={name}>
      <img className="legend-avatar" src={`/assets/legends/${file}`} alt={name} />
      <div>
        <div className="legend-name">{name}</div>
        <div className="legend-role">{t.legendRole}, {years}</div>
      </div>
    </div>
  ));

  return (
    <>
      <footer style={{ borderBottom: "none" }}>
        <div className="wrap footrow">
          <span>© 2026 SatyaPyla Karaoke</span>
          <a className="footer-yt" href="https://www.youtube.com/@Spkaraoke8981" target="_blank" rel="noopener">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.6V8.4L15.8 12Z" />
            </svg>
            <span>{t.footerYt}</span>
          </a>
          <span>{t.footerNote}</span>
        </div>
      </footer>

      <div className="legends-bar">
        <div className="legends-label">
          <span className="eyebrow">{t.legendsTribute}</span>
          <strong>{t.legendsTitle}</strong>
        </div>
        <div className="legends-track">
          <div className="legends-scroll">
            {cards}
            {cards}
          </div>
        </div>
      </div>
    </>
  );
}
