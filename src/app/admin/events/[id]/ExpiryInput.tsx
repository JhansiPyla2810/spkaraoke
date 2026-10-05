"use client";

import { useState } from "react";

function localValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function setHidden(form: HTMLFormElement | null, name: string, value: string) {
  if (!form) return;
  const hidden = form.elements.namedItem(name) as HTMLInputElement | null;
  if (!hidden) return;
  const ms = value ? new Date(value).getTime() : NaN;
  hidden.value = Number.isNaN(ms) ? "" : String(ms);
}

export default function ExpiryInput({ disabled }: { disabled?: boolean }) {
  const [min] = useState(() => localValue(new Date()));

  return (
    <>
      <div className="form-row" style={{ marginBottom: 0, flex: "1 1 200px" }}>
        <label htmlFor="startsAt">Access starts at</label>
        <input
          id="startsAt"
          type="datetime-local"
          min={min}
          defaultValue={min}
          disabled={disabled}
          style={{ width: "100%" }}
          onChange={(e) => setHidden(e.currentTarget.form, "startsAtMs", e.currentTarget.value)}
          onBlur={(e) => setHidden(e.currentTarget.form, "startsAtMs", e.currentTarget.value)}
        />
      </div>
      <div className="form-row" style={{ marginBottom: 0, flex: "1 1 200px" }}>
        <label htmlFor="expiresAt">Access ends at</label>
        <input
          id="expiresAt"
          type="datetime-local"
          min={min}
          required
          disabled={disabled}
          style={{ width: "100%" }}
          onChange={(e) => setHidden(e.currentTarget.form, "expiresAtMs", e.currentTarget.value)}
        />
      </div>
    </>
  );
}
