"use client";

import { useFormStatus } from "react-dom";
import type { ComponentProps } from "react";

// Disables itself (and shows a label change) while its parent <form>'s
// server action is in flight — a cheap guard against double-clicks firing
// the same action twice.
export default function SubmitButton({
  children,
  pendingLabel,
  ...props
}: ComponentProps<"button"> & { pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <button {...props} type="submit" disabled={pending || props.disabled}>
      {pending ? pendingLabel ?? "Please wait..." : children}
    </button>
  );
}
