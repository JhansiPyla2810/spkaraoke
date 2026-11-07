"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Script from "next/script";
import { useSearchParams } from "next/navigation";
import { appLogin } from "./actions";

// Scoped to this file only (not a global `declare global` augmentation, so
// it can't collide with the website's own, differently-shaped Window typing
// for the same Google script elsewhere in the app).
type GoogleIdentityWindow = Window & {
  google?: {
    accounts: {
      id: {
        initialize: (config: {
          client_id: string;
          callback: (response: { credential: string }) => void;
        }) => void;
        renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
      };
    };
  };
};

// Only ever redirect the completed sign-in back to a loopback address the
// Windows app itself is listening on - never an arbitrary URL - since the
// session token travels in that redirect and this page's query params are
// otherwise attacker-controllable.
function isSafeLoopbackCallback(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "http:" &&
      (parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost")
    );
  } catch {
    return false;
  }
}

export default function AppLoginPage() {
  return (
    <Suspense fallback={null}>
      <AppLoginInner />
    </Suspense>
  );
}

function AppLoginInner() {
  const searchParams = useSearchParams();
  const deviceId = searchParams.get("deviceId") ?? "";
  const callback = searchParams.get("callback") ?? "";
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [gsiReady, setGsiReady] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  const validLink = !!deviceId && isSafeLoopbackCallback(callback);

  useEffect(() => {
    if (!validLink || !gsiReady || !buttonRef.current) return;
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const win = window as GoogleIdentityWindow;
    if (!clientId || !win.google) return;

    if (!initialized.current) {
      win.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response) => {
          const result = await appLogin(response.credential, deviceId);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setDone(true);
          window.location.href = `${callback}?token=${encodeURIComponent(result.sessionToken)}`;
        },
      });
      initialized.current = true;
    }
    buttonRef.current.innerHTML = "";
    win.google.accounts.id.renderButton(buttonRef.current, {
      theme: "outline",
      size: "large",
      text: "signin_with",
    });
  }, [validLink, gsiReady, deviceId, callback]);

  return (
    <div style={{ maxWidth: 420, margin: "120px auto", padding: "0 24px", textAlign: "center" }}>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setGsiReady(true)}
      />
      <h1 style={{ fontFamily: "Archivo, sans-serif", fontSize: "1.3rem", marginBottom: 16 }}>
        Sign in to Satya Pyla Karaoke
      </h1>

      {!validLink && (
        <p style={{ color: "var(--muted)" }}>
          This page only works when opened from the desktop app.
        </p>
      )}

      {validLink && !done && (
        <>
          <p style={{ color: "var(--muted)", marginBottom: 20 }}>
            Sign in with the Google account your subscription is registered under.
          </p>
          <div ref={buttonRef} style={{ display: "flex", justifyContent: "center" }} />
        </>
      )}

      {error && (
        <p style={{ color: "#B02A37", marginTop: 16 }}>
          {error === "not_a_subscriber" && "This Google account doesn't have a subscription."}
          {error === "no_active_subscription" && "Your subscription isn't active right now."}
          {error === "invalid_google_token" && "Couldn't verify that sign-in. Please try again."}
        </p>
      )}

      {done && (
        <p style={{ color: "var(--good)" }}>
          Signed in — you can close this and return to the app.
        </p>
      )}
    </div>
  );
}
