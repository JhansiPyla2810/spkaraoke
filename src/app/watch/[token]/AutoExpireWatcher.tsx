"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Forces the server to re-check expiry (and show the "expired" notice)
// as soon as the grant's expiry time passes, without the viewer needing
// to manually reload the tab.
export default function AutoExpireWatcher({ expiresAt }: { expiresAt: number }) {
  const router = useRouter();

  useEffect(() => {
    const msLeft = expiresAt - Date.now();
    if (msLeft <= 0) {
      router.refresh();
      return;
    }
    const timer = setTimeout(() => router.refresh(), Math.min(msLeft + 500, 2147483647));
    return () => clearTimeout(timer);
  }, [expiresAt, router]);

  return null;
}
