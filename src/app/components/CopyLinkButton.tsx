"use client";

import { useState } from "react";

export default function CopyLinkButton({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(link);
        } catch {
          // Clipboard API unavailable — fall back to a manual prompt so
          // the link can still be copied by hand.
          window.prompt("Copy this link:", link);
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      title="Copy link"
      aria-label="Copy link"
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        color: copied ? "var(--good)" : "var(--muted)",
        fontSize: ".8rem",
        fontWeight: 700,
        flexShrink: 0,
        padding: "2px 4px",
      }}
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}
