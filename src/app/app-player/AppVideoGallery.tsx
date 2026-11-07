"use client";

import { useEffect, useMemo, useState } from "react";
import AppVideoPlayer from "./AppVideoPlayer";
import type { AppDownloadState } from "@/components/AppSignInLink";

type Video = { id: string; name: string };

// Only rendered when running inside the desktop app (the bridge exists).
// The actual download runs in the app's main process, so it keeps going if
// the user navigates away from this page.
function DownloadButton({ video, state }: { video: Video; state?: AppDownloadState }) {
  const status = state?.status;
  const pct = state?.total ? Math.floor(((state.done ?? 0) / state.total) * 100) : 0;
  const label =
    status === "complete"
      ? "✓ Downloaded"
      : status === "downloading"
        ? `Downloading ${pct}%`
        : status === "queued"
          ? "Queued…"
          : status === "error"
            ? "Retry download"
            : status === "blocked"
              ? "Needs reconnect"
              : "Download";
  const disabled = status === "complete" || status === "downloading" || status === "queued";
  return (
    <button
      type="button"
      className="btn btn-ghost"
      disabled={disabled}
      onClick={() => window.spkApp?.download?.(video.id)}
      title={status === "error" ? state?.error : undefined}
      style={{ fontSize: ".78rem", padding: "6px 10px", marginTop: 8, width: "100%", opacity: disabled ? 0.75 : 1 }}
    >
      {label}
    </button>
  );
}

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

function VideoCard({
  video,
  onOpen,
  canDownload,
  downloadState,
}: {
  video: Video;
  onOpen: (v: Video) => void;
  canDownload: boolean;
  downloadState?: AppDownloadState;
}) {
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
      <div style={{ position: "relative", width: "100%", aspectRatio: "16/9", background: "#000" }}>
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
        {canDownload && <DownloadButton video={video} state={downloadState} />}
      </div>
    </div>
  );
}

const PAGE_SIZE = 32;
const SESSION_CHECK_INTERVAL_MS = 30000;

// Independent copy of the website's /watch gallery, adapted for the
// subscriber app: builds stream URLs against /api/app/stream instead of
// /api/stream, and polls /api/app/session itself (no tab/device lock here -
// the app enforces single-session at login instead) so a suspend/revoke/
// expiry while the gallery is open gets noticed without a page reload.
export default function AppVideoGallery({
  videos,
  subscriberLabel,
  expiresAt,
  sessionToken,
  backendUrl,
}: {
  videos: Video[];
  subscriberLabel: string;
  expiresAt: number;
  sessionToken: string;
  backendUrl: string;
}) {
  const [query, setQuery] = useState("");
  const [activeVideo, setActiveVideo] = useState<Video | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [canDownload, setCanDownload] = useState(false);
  const [downloads, setDownloads] = useState<Record<string, AppDownloadState>>({});

  // Download buttons only exist inside the desktop app. Initial states come
  // from the app; live progress is pushed from its main process.
  useEffect(() => {
    const app = window.spkApp;
    if (!app?.download || !app.getDownloadStates || !app.onDownloadProgress) return;
    let cancelled = false;
    app.getDownloadStates().then((states) => {
      if (cancelled) return;
      setCanDownload(true);
      setDownloads(Object.fromEntries(states.map((s) => [s.videoId, s])));
    });
    const unsubscribe = app.onDownloadProgress((s) => setDownloads((prev) => ({ ...prev, [s.videoId]: s })));
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return videos;
    return videos.filter((v) => v.name.toLowerCase().includes(q));
  }, [videos, query]);

  const visible = filtered.slice(0, visibleCount);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${backendUrl}/api/app/session`, {
          headers: { Authorization: `Bearer ${sessionToken}` },
        });
        if (!res.ok) {
          setSessionEnded(true);
          setActiveVideo(null);
        }
      } catch {
        // offline/network hiccup - don't log out just for a failed check
      }
    }, SESSION_CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [backendUrl, sessionToken]);

  if (sessionEnded) {
    return (
      <div style={{ textAlign: "center", padding: "80px 20px" }}>
        <h2 style={{ marginBottom: 12 }}>Your session has ended.</h2>
        <p style={{ color: "var(--muted)" }}>
          Your subscription may have expired or changed. Please restart the app to sign in again.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setVisibleCount(PAGE_SIZE);
          }}
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
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(min(280px, 100%), 1fr))",
              gap: 20,
            }}
          >
            {visible.map((v) => (
              <VideoCard
                key={v.id}
                video={v}
                onOpen={setActiveVideo}
                canDownload={canDownload}
                downloadState={downloads[v.id]}
              />
            ))}
          </div>
          {visibleCount < filtered.length && (
            <div style={{ display: "flex", justifyContent: "center", marginTop: 28 }}>
              <button className="btn btn-ghost" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}>
                Load more ({filtered.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </>
      )}

      {activeVideo && (
        <AppVideoPlayer
          streamUrl={`${backendUrl}/api/app/stream/${activeVideo.id}?token=${encodeURIComponent(sessionToken)}`}
          title={activeVideo.name}
          subscriberLabel={subscriberLabel}
          expiresAt={expiresAt}
          onClose={() => setActiveVideo(null)}
          onSessionInvalid={() => {
            setActiveVideo(null);
            setSessionEnded(true);
          }}
        />
      )}
    </div>
  );
}
