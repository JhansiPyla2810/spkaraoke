"use client";

export default function ExpiryInput() {
  return (
    <div className="form-row" style={{ marginBottom: 0 }}>
      <label htmlFor="expiresAt">Access expires at</label>
      <input
        id="expiresAt"
        type="datetime-local"
        required
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
