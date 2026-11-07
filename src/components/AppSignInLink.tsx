"use client";

import { useState } from "react";

// Exposed only by the Electron app's preload bridge - undefined for every
// regular website visitor, so this component falls back to the normal
// anchor link whenever it's not present (belt-and-suspenders alongside the
// server-side isApp check from the request's user-agent).
declare global {
  interface Window {
    spkApp?: {
      login: () => Promise<{ ok: boolean; error?: string }>;
      logout: () => Promise<{ ok: boolean }>;
    };
  }
}

// Same nav/hero "Get Access" spot, with three states:
// - regular website visitor: unchanged anchor scroll to #contact.
// - in the app, not signed in: a real sign-in trigger - opens the system
//   browser for Google sign-in, and on success the app's own window
//   navigates itself back to this same homepage (now signed in).
// - in the app, signed in: a plain link into the video gallery - signing
//   in only ever lands back on the homepage, never forces the gallery, so
//   this is the one explicit way in and the gallery always has a way back
//   out to here too (see AppPlayerPage's "Home" link).
export default function AppSignInLink({
  isApp,
  signedIn,
  sessionToken,
  fallbackHref,
  fallbackLabel,
  className,
}: {
  isApp: boolean;
  signedIn: boolean;
  sessionToken?: string;
  fallbackHref: string;
  fallbackLabel: React.ReactNode;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "opening" | "error">("idle");

  if (!isApp) {
    return (
      <a className={className} href={fallbackHref}>
        {fallbackLabel}
      </a>
    );
  }

  if (signedIn) {
    return (
      <a className={className} href={`/app-player?token=${encodeURIComponent(sessionToken ?? "")}`}>
        Access karaoke videos
      </a>
    );
  }

  async function handleClick() {
    if (!window.spkApp) return;
    setState("opening");
    const result = await window.spkApp.login();
    setState(result.ok ? "idle" : "error");
  }

  return (
    <button type="button" className={className} onClick={handleClick} disabled={state === "opening"}>
      {state === "opening" ? "Opening browser..." : state === "error" ? "Couldn't sign in - try again" : "Sign in"}
    </button>
  );
}
