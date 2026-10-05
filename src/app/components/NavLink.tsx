"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import type { ComponentProps } from "react";

function PendingLabel({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useLinkStatus();
  return <>{pending ? pendingLabel : label}</>;
}

// A next/link that shows a "Loading..." style label while the navigation
// it triggers is in flight — Link itself has no built-in loading state.
export default function NavLink({
  children,
  pendingLabel = "Loading...",
  ...props
}: ComponentProps<typeof Link> & { children: string; pendingLabel?: string }) {
  return (
    <Link {...props}>
      <PendingLabel label={children} pendingLabel={pendingLabel} />
    </Link>
  );
}
