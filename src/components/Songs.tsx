"use client";

import { useMemo, useState } from "react";
import { useLang } from "@/lib/LangProvider";

export type Song = { id: number; title: string; movie: string; hero: string };

export default function Songs({ songs, totalCount }: { songs: Song[]; totalCount: number }) {
  const { t } = useLang();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return songs.slice(0, 50);
    return songs
      .filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.movie.toLowerCase().includes(q) ||
          s.hero.toLowerCase().includes(q)
      )
      .slice(0, 200);
  }, [songs, query]);

  return (
    <section id="songs">
      <div className="wrap">
        <div className="section-head">
          <span className="eyebrow">{t.songsEyebrow}</span>
          <h2>{t.songsH2}</h2>
          <p>{t.songsP}</p>
        </div>
        <div className="filters">
          <input
            type="search"
            placeholder={t.songsSearchPh}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="songcount">
          Showing <b>{filtered.length}</b> of {totalCount} Telugu tracks catalogued
        </div>
        <div className="songtable-wrap">
          <table>
            <thead>
              <tr>
                <th>{t.thSong}</th>
                <th>{t.thMovie}</th>
                <th>{t.thHero}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={3}>
                    <div className="emptystate">{t.noMatch}</div>
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id}>
                    <td>{s.title}</td>
                    <td>{s.movie}</td>
                    <td>{s.hero}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="catalog-note">
          {t.songsNotePrefix}
          {totalCount.toLocaleString()}
          {t.songsNoteMid}
          <a href="#contact">{t.songsNoteLink}</a>
          {t.songsNoteSuffix}
        </p>
      </div>
    </section>
  );
}
