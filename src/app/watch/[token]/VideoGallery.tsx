"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Video = { id: string; name: string };

// Fixed size Drive's embedded player is rendered at internally, before we
// scale it down to fit the actual visible box — large enough that Drive
// always treats it as a "desktop" viewport and keeps its normal control
// bar layout instead of the cramped small-screen one.
const DRIVE_PLAYER_WIDTH = 960;
const DRIVE_PLAYER_HEIGHT = 540;

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

function Watermark({ clientName, expiresAt }: { clientName: string; expiresAt: number }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      style={{
        position: "absolute",
        top: "3%",
        left: "3%",
        textAlign: "left",
        color: "rgba(255,255,255,.95)",
        background: "rgba(0,0,0,.5)",
        padding: "clamp(4px, 1.2vh, 10px) clamp(8px, 2vw, 16px)",
        borderRadius: 8,
        pointerEvents: "none",
        zIndex: 2,
        lineHeight: 1.45,
        maxWidth: "70%",
      }}
    >
      <div style={{ fontSize: "clamp(.6rem, 2vh, .95rem)", fontWeight: 700 }}>
        Temporary access for {clientName} &middot; expires {new Date(expiresAt).toLocaleString()}
      </div>
      <div style={{ fontSize: "clamp(.54rem, 1.6vh, .8rem)", color: "rgba(255,255,255,.85)" }}>
        &copy; {now.getFullYear()} Satya Pyla Karaoke
      </div>
      <div style={{ fontSize: "clamp(.5rem, 1.4vh, .74rem)", color: "rgba(255,255,255,.65)" }}>
        {now.toLocaleString()}
      </div>
    </div>
  );
}

function Lightbox({
  video,
  clientName,
  expiresAt,
  onClose,
}: {
  video: Video;
  clientName: string;
  expiresAt: number;
  onClose: () => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    // Drive's embedded player switches to a cramped, scattered-controls
    // layout once the iframe gets small. Rendering it at a fixed "desktop"
    // size and visually scaling it down keeps Drive's normal control bar
    // layout at any screen size.
    const update = () => setScale(el.clientWidth / DRIVE_PLAYER_WIDTH);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.82)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "clamp(8px, 3vw, 24px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 960 }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <span
            style={{
              color: "#fff",
              fontWeight: 700,
              fontSize: ".95rem",
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {video.name}
          </span>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button
              onClick={() => stageRef.current?.requestFullscreen()}
              aria-label="Fullscreen"
              style={{
                background: "rgba(255,255,255,.12)",
                border: "none",
                color: "#fff",
                width: 32,
                height: 32,
                borderRadius: "50%",
                cursor: "pointer",
                fontSize: ".9rem",
                flexShrink: 0,
              }}
            >
              ⛶
            </button>
            <button
              onClick={onClose}
              aria-label="Close"
              style={{
                background: "rgba(255,255,255,.12)",
                border: "none",
                color: "#fff",
                width: 32,
                height: 32,
                borderRadius: "50%",
                cursor: "pointer",
                fontSize: "1rem",
                flexShrink: 0,
              }}
            >
              ✕
            </button>
          </div>
        </div>
        <div
          ref={stageRef}
          style={{
            position: "relative",
            width: "100%",
            aspectRatio: "16/9",
            borderRadius: 10,
            overflow: "hidden",
            background: "#000",
          }}
        >
          <div
            style={{
              width: DRIVE_PLAYER_WIDTH,
              height: DRIVE_PLAYER_HEIGHT,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          >
            <iframe
              src={`https://drive.google.com/file/d/${video.id}/preview`}
              allow="autoplay"
              style={{ width: DRIVE_PLAYER_WIDTH, height: DRIVE_PLAYER_HEIGHT, border: "none" }}
            />
          </div>
          <Watermark clientName={clientName} expiresAt={expiresAt} />
        </div>
      </div>
    </div>
  );
}

export default function VideoGallery({
  videos,
  clientName,
  expiresAt,
}: {
  videos: Video[];
  clientName: string;
  expiresAt: number;
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
        <Lightbox
          video={activeVideo}
          clientName={clientName}
          expiresAt={expiresAt}
          onClose={() => setActiveVideo(null)}
        />
      )}
    </div>
  );
}
