"use client";

import { useEffect, useState } from "react";

// Server rendering runs in UTC on Vercel, so formatting a timestamp with
// toLocaleString() there shows the wrong time to viewers in other
// timezones. Render a safe fallback first, then correct it to the
// viewer's actual local time once mounted in the browser.
export default function LocalTime({ ms }: { ms: number }) {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    setText(new Date(ms).toLocaleString());
  }, [ms]);

  return <>{text ?? new Date(ms).toISOString()}</>;
}
