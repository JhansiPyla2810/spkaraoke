"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Script from "next/script";
import { checkSession, claimSession } from "./actions";
import type { SessionStatus } from "@/lib/deviceSession";

// Dispatched by VideoPlayer the instant a stream request comes back 409
// (session superseded) — lets SessionGate react immediately instead of
// waiting for its next poll tick.
export const SESSION_LOCKED_EVENT = "spk:session-locked";

const POLL_MS = 5000;

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
          prompt: () => void;
        };
      };
    };
  }
}

function tabStorageKey(token: string) {
  return `wtab_${token}`;
}

// Reads this tab's session id from sessionStorage (per-tab, not shared with
// other tabs even on the same device/browser), generating one the first
// time this tab ever asks. Returns whether it already existed, so the
// server can tell "brand new tab" apart from "this exact tab held the
// claim before and has since been superseded."
function getTabId(token: string): { tabId: string; hadExisting: boolean } {
  const key = tabStorageKey(token);
  const existing = sessionStorage.getItem(key);
  if (existing) return { tabId: existing, hadExisting: true };
  const fresh = crypto.randomUUID();
  sessionStorage.setItem(key, fresh);
  return { tabId: fresh, hadExisting: false };
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: 480, margin: "120px auto", padding: "0 24px", textAlign: "center" }}>
      {children}
    </div>
  );
}

type GateState = { kind: "loading" } | { kind: "match" } | { kind: "needs-claim"; status: SessionStatus };

export default function SessionGate({ token, children }: { token: string; children: React.ReactNode }) {
  const [state, setState] = useState<GateState>({ kind: "loading" });
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<"wrong_account" | null>(null);
  const stateRef = useRef<GateState>({ kind: "loading" });
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  const buttonRef = useRef<HTMLDivElement>(null);
  const gsiReady = useRef(false);

  const refresh = useCallback(async () => {
    const { tabId, hadExisting } = getTabId(token);
    const status = await checkSession(token, tabId, hadExisting);
    setState(status === "match" ? { kind: "match" } : { kind: "needs-claim", status });
  }, [token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount, resolves asynchronously
    refresh();

    // Once we hold the link, keep checking in the background so a takeover
    // from another tab/device gets noticed on its own, the same way Hotstar
    // logs an old session out without it having to do anything first.
    const interval = setInterval(() => {
      if (stateRef.current.kind === "match") refresh();
    }, POLL_MS);

    const onLocked = () => refresh();
    window.addEventListener(SESSION_LOCKED_EVENT, onLocked);

    return () => {
      clearInterval(interval);
      window.removeEventListener(SESSION_LOCKED_EVENT, onLocked);
    };
  }, [refresh]);

  const handleCredential = useCallback(
    (response: { credential: string }) => {
      const { tabId } = getTabId(token);
      setSigningIn(true);
      setError(null);
      (async () => {
        const result = await claimSession(token, tabId, response.credential);
        setSigningIn(false);
        if (result.ok) {
          setState({ kind: "match" });
        } else {
          setError("wrong_account");
        }
      })();
    },
    [token]
  );

  // Render the Google "Sign in" button once the GSI script is loaded and
  // we actually need it (any non-"match" state, repeatedly re-rendered
  // since the button's host div gets replaced whenever this state flips).
  const initialized = useRef(false);
  useEffect(() => {
    if (state.kind !== "needs-claim" || !gsiReady.current || !buttonRef.current) return;
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId || !window.google) return;
    if (!initialized.current) {
      window.google.accounts.id.initialize({ client_id: clientId, callback: handleCredential });
      initialized.current = true;
    }
    buttonRef.current.innerHTML = "";
    window.google.accounts.id.renderButton(buttonRef.current, { theme: "outline", size: "large", text: "signin_with" });
  }, [state, handleCredential]);

  if (state.kind === "loading") return null;
  if (state.kind === "match") return <>{children}</>;

  const isFirstOpen = state.status === "unclaimed";
  const sameDevice = state.status === "tab-new" || state.status === "tab-kicked";

  return (
    <Shell>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => {
          gsiReady.current = true;
          // Force the render effect above to re-run now that the script is ready.
          setState((s) => ({ ...s }));
        }}
      />
      <h1 style={{ fontFamily: "Archivo, sans-serif", fontSize: "1.4rem", marginBottom: 12 }}>
        {isFirstOpen
          ? "Sign in with your Google account to start watching."
          : `This link is already open in ${sameDevice ? "another tab on this device" : "use on another device"}.`}
      </h1>
      {!isFirstOpen && (
        <p style={{ color: "var(--muted)", marginBottom: 20 }}>
          Continuing here will close it {sameDevice ? "there" : "on the other device"}.
        </p>
      )}
      {error && (
        <p style={{ color: "var(--bad, #d14)", fontSize: ".82rem", marginBottom: 16 }}>
          That Google account isn&apos;t the one this link was created for. Please sign in with the
          correct account.
        </p>
      )}
      {signingIn ? (
        <p style={{ color: "var(--muted)" }}>Checking...</p>
      ) : (
        <div ref={buttonRef} style={{ display: "flex", justifyContent: "center" }} />
      )}
    </Shell>
  );
}
