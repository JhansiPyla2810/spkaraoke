"use client";

import { useState } from "react";
import { extendGrant } from "../actions";
import SubmitButton from "@/app/components/SubmitButton";

const OPTIONS = [
  { minutes: 15, label: "15 minutes" },
  { minutes: 30, label: "30 minutes" },
  { minutes: 60, label: "1 hour" },
];

export default function ExtendControl({ grantId, eventId }: { grantId: number; eventId: number }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(OPTIONS[0].minutes);

  function close() {
    setOpen(false);
    setSelected(OPTIONS[0].minutes);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          background: "var(--surface2)",
          border: "1px solid var(--line)",
          borderRadius: 6,
          padding: "4px 10px",
          fontSize: ".82rem",
          fontWeight: 700,
          color: "var(--ink)",
          cursor: "pointer",
        }}
      >
        Extend
      </button>

      {open && (
        <div
          onClick={close}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(10,13,18,.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: 14,
              boxShadow: "0 24px 48px -16px rgba(0,0,0,.4)",
              padding: 20,
              width: "100%",
              maxWidth: 280,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 12 }}>Extend access by</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
              {OPTIONS.map((opt) => {
                const isSelected = selected === opt.minutes;
                return (
                  <button
                    key={opt.minutes}
                    type="button"
                    onClick={() => setSelected(opt.minutes)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "9px 12px",
                      borderRadius: 8,
                      border: `1px solid ${isSelected ? "var(--accent)" : "var(--line)"}`,
                      background: isSelected ? "color-mix(in srgb, var(--accent) 12%, transparent)" : "var(--surface)",
                      color: "var(--ink)",
                      fontWeight: isSelected ? 700 : 400,
                      cursor: "pointer",
                    }}
                  >
                    +{opt.label}
                  </button>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={close}
                style={{
                  background: "none",
                  border: "1px solid var(--line)",
                  borderRadius: 8,
                  padding: "8px 16px",
                  color: "var(--ink)",
                  fontSize: ".88rem",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <form action={extendGrant} onSubmit={close}>
                <input type="hidden" name="id" value={grantId} />
                <input type="hidden" name="eventId" value={eventId} />
                <input type="hidden" name="minutes" value={selected} />
                <SubmitButton className="btn btn-primary" pendingLabel="Extending...">
                  OK
                </SubmitButton>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
