"use client";

import { useMemo, useState } from "react";
import VideoPlayer from "./VideoPlayer";

type Video = { id: string; name: string };

function PlayButton() {
  return (
    <span
      style={{
        width: 56,
        height: 56,
        borderRadius: "50%",
        background: "var(--brand-gradient)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 10px 24px -8px rgba(0,0,0,.5)",
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--accent-ink)">
        <path d="M8 5v14l11-7z" />
      </svg>
    </span>
  );
}

function VideoCard({ video, onOpen }: { video: Video; onOpen: (v: Video) => void }) {
  return (
    <div
      style={{
        border: "1px solid var(--line)",
        borderRadius: 14,
        overflow: "hidden",
        background: "var(--surface)",
        boxShadow: "0 16px 32px -24px rgba(0,0,0,.28)",
        transition: "transform .2s ease, box-shadow .2s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 20px 40px -22px rgba(0,0,0,.32)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 16px 32px -24px rgba(0,0,0,.28)";
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "16/9",
          background: "#000",
        }}
      >
        <button
          onClick={() => onOpen(video)}
          aria-label={`Play ${video.name}`}
          style={{
            width: "100%",
            height: "100%",
            border: "none",
            background:
              "linear-gradient(135deg, color-mix(in srgb, var(--accent) 35%, #000), color-mix(in srgb, var(--accent-warm) 35%, #000))",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <PlayButton />
        </button>
      </div>
      <div style={{ padding: "12px 14px" }}>
        <div
          style={{
            fontWeight: 700,
            fontSize: ".92rem",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
          title={video.name}
        >
          {video.name}
        </div>
      </div>
    </div>
  );
}

export default function VideoGallery({
  videos,
  clientName,
  expiresAt,
  grantToken,
}: {
  videos: Video[];
  clientName: string;
  expiresAt: number;
  grantToken: string;
}) {
  const [query, setQuery] = useState("");
  const [activeVideo, setActiveVideo] = useState<Video | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return videos;
    return videos.filter((v) => v.name.toLowerCase().includes(q));
  }, [videos, query]);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${videos.length} video${videos.length === 1 ? "" : "s"}...`}
          style={{
            width: "100%",
            maxWidth: 420,
            background: "var(--surface)",
            border: "1px solid var(--line)",
            color: "var(--ink)",
            padding: "11px 14px",
            borderRadius: 8,
            fontFamily: "Manrope, sans-serif",
            fontSize: ".92rem",
          }}
        />
        {query && (
          <p style={{ color: "var(--muted)", fontSize: ".82rem", marginTop: 8 }}>
            {filtered.length} match{filtered.length === 1 ? "" : "es"}
          </p>
        )}
      </div>

      {filtered.length === 0 ? (
        <p style={{ color: "var(--muted)" }}>No videos match &quot;{query}&quot;.</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(min(280px, 100%), 1fr))",
            gap: 20,
          }}
        >
          {filtered.map((v) => (
            <VideoCard key={v.id} video={v} onOpen={setActiveVideo} />
          ))}
        </div>
      )}

      {activeVideo && (
        <VideoPlayer
          streamUrl={`/api/stream/${activeVideo.id}?token=${grantToken}`}
          title={activeVideo.name}
          clientName={clientName}
          expiresAt={expiresAt}
          onClose={() => setActiveVideo(null)}
        />
      )}
    </div>
  );
}
