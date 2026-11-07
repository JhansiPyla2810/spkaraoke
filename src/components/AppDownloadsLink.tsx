"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

// Opens the desktop app's own offline Downloads screen (a local page bundled
// in the app, so it works without internet). Renders nothing outside the app
// - the bridge only exists inside it - and nothing during server rendering.
export default function AppDownloadsLink({ className }: { className?: string }) {
  const available = useSyncExternalStore(
    noopSubscribe,
    () => typeof window.spkApp?.openDownloads === "function",
    () => false
  );
  if (!available) return null;
  return (
    <button type="button" className={className} onClick={() => window.spkApp?.openDownloads?.()}>
      Downloads
    </button>
  );
}
