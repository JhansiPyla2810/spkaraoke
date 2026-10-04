"use client";

import { useEffect, useRef, useState } from "react";

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

const PLAYBACK_RATES = [1, 1.5, 2, 0.5];

function IconPlay({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}
function IconPause() {
  return (
    <span style={{ display: "flex", gap: 3 }}>
      <span style={{ width: 4, height: 14, borderRadius: 1, background: "#fff" }} />
      <span style={{ width: 4, height: 14, borderRadius: 1, background: "#fff" }} />
    </span>
  );
}
function IconVolume({ muted, size = 18 }: { muted: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M11 5 6 9H3v6h3l5 4V5Z" />
      {!muted && <path d="M15.5 8.5a5 5 0 0 1 0 7" />}
      {muted && <path d="M17 9l4 6M21 9l-4 6" />}
    </svg>
  );
}
function IconMaximize({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}
function IconClose({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function iconButtonStyle(size: number): React.CSSProperties {
  return {
    width: size,
    height: size,
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "none",
    border: "none",
    borderRadius: 6,
    color: "#fff",
    cursor: "pointer",
  };
}

export default function VideoPlayer({
  streamUrl,
  title,
  clientName,
  expiresAt,
  onClose,
}: {
  streamUrl: string;
  title: string;
  clientName: string;
  expiresAt: number;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [watermarkInset, setWatermarkInset] = useState({ top: 0, left: 0 });
  const [hoverRatio, setHoverRatio] = useState<number | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [loadProgress, setLoadProgress] = useState(0);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasAutoFullscreened = useRef(false);

  function showControls() {
    setControlsVisible(true);
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    if (videoRef.current && !videoRef.current.paused) {
      hideTimeoutRef.current = setTimeout(() => setControlsVisible(false), 4000);
    }
  }

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // Watermark alignment: in the normal (cover) mode the video always fills
  // the frame edge-to-edge, so top-left of the container IS top-left of the
  // video — no math needed. In fullscreen we switch to "contain" (so the
  // video isn't cropped at large size), which can letterbox; there we
  // measure the real rendered video box and offset the watermark to match.
  useEffect(() => {
    if (!isFullscreen) {
      setWatermarkInset({ top: 0, left: 0 });
      return;
    }
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container || !video) return;

    function update() {
      if (!container || !video) return;
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (!vw || !vh) {
        setWatermarkInset({ top: 0, left: 0 });
        return;
      }
      const containerRatio = container.clientWidth / container.clientHeight;
      const videoRatio = vw / vh;
      let top = 0;
      let left = 0;
      if (videoRatio > containerRatio) {
        const renderedHeight = container.clientWidth / videoRatio;
        top = (container.clientHeight - renderedHeight) / 2;
      } else {
        const renderedWidth = container.clientHeight * videoRatio;
        left = (container.clientWidth - renderedWidth) / 2;
      }
      setWatermarkInset({ top, left });
    }

    update();
    window.addEventListener("resize", update);
    // Video metadata (and so videoWidth/videoHeight) may not have loaded
    // yet at the moment fullscreen is entered — recompute once it has.
    video.addEventListener("loadedmetadata", update);
    return () => {
      window.removeEventListener("resize", update);
      video.removeEventListener("loadedmetadata", update);
    };
  }, [isFullscreen, duration]);

  // Download the whole video into memory before it's playable, instead of
  // streaming it live — so once it starts, a network drop mid-song (e.g.
  // on stage) can't interrupt playback. Progress is shown to the viewer;
  // the video stays paused until this finishes and they tap play.
  useEffect(() => {
    setLoadProgress(0);
    setLoadError(false);
    setBlobUrl(null);

    const xhr = new XMLHttpRequest();
    xhr.open("GET", streamUrl);
    xhr.responseType = "blob";
    xhr.onprogress = (e) => {
      if (e.lengthComputable) setLoadProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        setBlobUrl(URL.createObjectURL(xhr.response));
      } else {
        setLoadError(true);
      }
    };
    xhr.onerror = () => setLoadError(true);
    xhr.send();

    return () => xhr.abort();
  }, [streamUrl, reloadKey]);

  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  function togglePlay() {
    const video = videoRef.current;
    if (!video || !blobUrl) return;
    if (video.paused) {
      video.play();
      showControls();
      // On phones, go straight to fullscreen the first time they hit play
      // — no need for a second tap. Checked via the shorter viewport edge
      // so it's correct in both portrait and landscape.
      const isPhoneSized = Math.min(window.innerWidth, window.innerHeight) <= 500;
      if (isPhoneSized && !hasAutoFullscreened.current && containerRef.current) {
        hasAutoFullscreened.current = true;
        containerRef.current.requestFullscreen().catch(() => {});
      }
    } else {
      video.pause();
    }
  }

  function toggleMute() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  }

  function handleVolumeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const video = videoRef.current;
    if (!video) return;
    const next = Number(e.target.value);
    video.volume = next;
    video.muted = next === 0;
    setVolume(next);
    setMuted(video.muted);
  }

  function cyclePlaybackRate() {
    const video = videoRef.current;
    if (!video) return;
    const next = PLAYBACK_RATES[(PLAYBACK_RATES.indexOf(playbackRate) + 1) % PLAYBACK_RATES.length];
    video.playbackRate = next;
    setPlaybackRate(next);
  }

  function toggleFullscreen() {
    const container = containerRef.current;
    if (!container) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else container.requestFullscreen();
  }

  function ratioFromPointer(e: { clientX: number }, rect: DOMRect) {
    return Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
  }

  function seek(e: React.MouseEvent<HTMLDivElement>) {
    const video = videoRef.current;
    if (!video || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    video.currentTime = ratioFromPointer(e, rect) * duration;
  }

  function handleSeekHover(e: React.MouseEvent<HTMLDivElement>) {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setHoverRatio(ratioFromPointer(e, rect));
  }

  const progressPct = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10,13,18,.82)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "clamp(8px, 3vw, 24px)",
      }}
    >
      <div
        ref={containerRef}
        onClick={(e) => e.stopPropagation()}
        onMouseMove={showControls}
        onMouseLeave={() => {
          if (videoRef.current && !videoRef.current.paused) setControlsVisible(false);
        }}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 1080,
          aspectRatio: "16/9",
          borderRadius: isFullscreen ? 0 : 14,
          overflow: "hidden",
          background: "#000",
        }}
      >
        <video
          ref={videoRef}
          src={blobUrl ?? undefined}
          playsInline
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            objectFit: isFullscreen ? "contain" : "cover",
          }}
          onClick={togglePlay}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        />

        <div
          style={{
            position: "absolute",
            top: watermarkInset.top + 10,
            left: watermarkInset.left + 10,
            textAlign: "left",
            color: "rgba(255,255,255,.95)",
            background: "rgba(0,0,0,.5)",
            padding: "clamp(7px, 1.2vh, 9px) clamp(12px, 1.8vw, 14px)",
            borderRadius: 6,
            pointerEvents: "none",
            zIndex: 2,
            lineHeight: 1.35,
            maxWidth: "70%",
          }}
        >
          <div style={{ fontSize: "clamp(.8rem, 1.8vh, .84rem)", fontWeight: 700 }}>
            Temporary access for {clientName} &middot; expires {new Date(expiresAt).toLocaleString()}
          </div>
          <div style={{ fontSize: "clamp(.64rem, 1.4vh, .66rem)", color: "rgba(255,255,255,.85)" }}>
            &copy; {now.getFullYear()} Satya Pyla Karaoke
          </div>
          <div style={{ fontSize: "clamp(.58rem, 1.2vh, .6rem)", color: "rgba(255,255,255,.65)" }}>
            {now.toLocaleString()}
          </div>
        </div>

        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            zIndex: 3,
            background: "rgba(0,0,0,.4)",
            width: 36,
            height: 36,
            borderRadius: "50%",
            border: "none",
            color: "#fff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: controlsVisible ? 1 : 0,
            pointerEvents: controlsVisible ? "auto" : "none",
            transition: "opacity .2s ease",
          }}
        >
          <IconClose />
        </button>

        {loadError && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              textAlign: "center",
              color: "#fff",
              zIndex: 2,
            }}
          >
            <p style={{ marginBottom: 12, fontSize: ".9rem" }}>Couldn&apos;t load this video.</p>
            <button
              onClick={() => setReloadKey((k) => k + 1)}
              className="btn btn-primary"
              style={{ fontSize: ".85rem" }}
            >
              Try again
            </button>
          </div>
        )}

        {!loadError && !blobUrl && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 120,
              textAlign: "center",
              color: "#fff",
              zIndex: 2,
            }}
          >
            <div
              style={{
                position: "relative",
                width: 72,
                height: 72,
                margin: "0 auto 12px",
                borderRadius: "50%",
                background: `conic-gradient(#fff ${loadProgress * 3.6}deg, rgba(255,255,255,.2) 0deg)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: "50%",
                  background: "rgba(10,13,18,.9)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: ".85rem",
                  fontWeight: 700,
                }}
              >
                {loadProgress}%
              </div>
            </div>
            <p style={{ fontSize: ".8rem", color: "rgba(255,255,255,.8)" }}>Loading for offline playback...</p>
          </div>
        )}

        {!loadError && blobUrl && !playing && (
          <button
            onClick={togglePlay}
            aria-label="Play"
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 72,
              height: 72,
              borderRadius: "50%",
              border: "none",
              background: "rgba(10,13,18,.45)",
              color: "#fff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 2,
            }}
          >
            <IconPlay size={30} />
          </button>
        )}

        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            background: "linear-gradient(to top, rgba(0,0,0,.55), transparent)",
            padding: "28px 10px 10px",
            display: "flex",
            flexDirection: "column",
            gap: 6,
            opacity: controlsVisible ? 1 : 0,
            pointerEvents: controlsVisible ? "auto" : "none",
            transition: "opacity .2s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              onClick={togglePlay}
              disabled={!blobUrl}
              aria-label={playing ? "Pause" : "Play"}
              style={{ ...iconButtonStyle(34), opacity: blobUrl ? 1 : .4, cursor: blobUrl ? "pointer" : "default" }}
            >
              {playing ? <IconPause /> : <IconPlay size={18} />}
            </button>

            <button onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"} style={iconButtonStyle(34)}>
              <IconVolume muted={muted} />
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={muted ? 0 : volume}
              onChange={handleVolumeChange}
              aria-label="Volume"
              className="player-volume"
              style={{ width: 60, accentColor: "#fff", flexShrink: 0 }}
            />

            <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0, padding: "0 6px" }}>
              <span style={{ fontSize: ".72rem", fontWeight: 700, color: "#fff", flexShrink: 0, width: 38 }}>
                {formatTime(currentTime)}
              </span>
              <div
                onClick={seek}
                onMouseMove={handleSeekHover}
                onMouseLeave={() => setHoverRatio(null)}
                onTouchMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setHoverRatio(ratioFromPointer(e.touches[0], rect));
                }}
                onTouchEnd={(e) => {
                  const video = videoRef.current;
                  const rect = e.currentTarget.getBoundingClientRect();
                  if (video && duration && e.changedTouches[0]) {
                    video.currentTime = ratioFromPointer(e.changedTouches[0], rect) * duration;
                  }
                  setHoverRatio(null);
                }}
                style={{
                  position: "relative",
                  flex: 1,
                  height: 6,
                  borderRadius: 999,
                  background: "rgba(255,255,255,.25)",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    width: `${progressPct}%`,
                    height: "100%",
                    borderRadius: 999,
                    background: "#fff",
                  }}
                />
                {hoverRatio !== null && (
                  <>
                    <div
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: `${hoverRatio * 100}%`,
                        transform: "translate(-50%, -50%)",
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        background: "#fff",
                        boxShadow: "0 0 0 3px rgba(255,255,255,.3)",
                        pointerEvents: "none",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        bottom: "calc(100% + 8px)",
                        left: `${hoverRatio * 100}%`,
                        transform: "translateX(-50%)",
                        background: "rgba(0,0,0,.85)",
                        color: "#fff",
                        fontSize: ".72rem",
                        fontWeight: 700,
                        padding: "3px 7px",
                        borderRadius: 5,
                        pointerEvents: "none",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatTime(hoverRatio * duration)}
                    </div>
                  </>
                )}
              </div>
              <span
                style={{
                  fontSize: ".72rem",
                  fontWeight: 700,
                  color: "#fff",
                  flexShrink: 0,
                  width: 44,
                  textAlign: "right",
                }}
              >
                -{formatTime(duration - currentTime)}
              </span>
            </div>

            <button
              onClick={cyclePlaybackRate}
              aria-label="Playback speed"
              style={{ ...iconButtonStyle(34), fontSize: ".72rem", fontWeight: 700 }}
            >
              {playbackRate}x
            </button>
            <button onClick={toggleFullscreen} aria-label="Fullscreen" style={iconButtonStyle(34)}>
              <IconMaximize />
            </button>
          </div>
          <div style={{ fontSize: ".78rem", color: "rgba(255,255,255,.75)", fontWeight: 600 }}>{title}</div>
        </div>
      </div>
    </div>
  );
}
