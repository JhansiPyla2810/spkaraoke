"use client";

import { useMemo, useState } from "react";

type Video = { id: string; name: string };

function VideoCard({ video }: { video: Video }) {
  const [playing, setPlaying] = useState(false);

  return (
    <div>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>{video.name}</div>
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "16/9",
          borderRadius: 10,
          overflow: "hidden",
          border: "1px solid var(--line)",
          background: "#000",
        }}
      >
        {playing ? (
          <iframe
            src={`https://drive.google.com/file/d/${video.id}/preview`}
            allow="autoplay"
            style={{ width: "100%", height: "100%", border: "none" }}
            allowFullScreen
          />
        ) : (
          <button
            onClick={() => setPlaying(true)}
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              background: "none",
              cursor: "pointer",
              color: "#fff",
              fontSize: "1rem",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ▶ Play
          </button>
        )}
      </div>
    </div>
  );
}

export default function VideoGallery({ videos }: { videos: Video[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return videos;
    return videos.filter((v) => v.name.toLowerCase().includes(q));
  }, [videos, query]);

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${videos.length} video${videos.length === 1 ? "" : "s"}...`}
          style={{
            width: "100%",
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid var(--line)",
            fontSize: ".95rem",
          }}
        />
        {query && (
          <p style={{ color: "var(--muted)", fontSize: ".82rem", marginTop: 6 }}>
            {filtered.length} match{filtered.length === 1 ? "" : "es"}
          </p>
        )}
      </div>

      {filtered.length === 0 ? (
        <p style={{ color: "var(--muted)" }}>No videos match &quot;{query}&quot;.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          {filtered.map((v) => (
            <VideoCard key={v.id} video={v} />
          ))}
        </div>
      )}
    </div>
  );
}
