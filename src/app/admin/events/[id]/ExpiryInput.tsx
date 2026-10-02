"use client";

import { useState } from "react";

function localMinValue() {
  const d = new Date();
  d.setSeconds(0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ExpiryInput() {
  const [min] = useState(localMinValue);

  return (
    <div className="form-row" style={{ marginBottom: 0, flex: "1 1 200px" }}>
      <label htmlFor="expiresAt">Access expires at</label>
      <input
        id="expiresAt"
        type="datetime-local"
        min={min}
        required
        style={{ width: "100%" }}
        onChange={(e) => {
          const form = e.currentTarget.form;
          if (!form) return;
          const hidden = form.elements.namedItem("expiresAtMs") as HTMLInputElement | null;
          if (!hidden) return;
          const ms = e.currentTarget.value ? new Date(e.currentTarget.value).getTime() : NaN;
          hidden.value = Number.isNaN(ms) ? "" : String(ms);
        }}
      />
    </div>
  );
}
