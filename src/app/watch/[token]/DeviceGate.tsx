"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { claimDevice } from "./actions";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: 480, margin: "120px auto", padding: "0 24px", textAlign: "center" }}>
      {children}
    </div>
  );
}

export default function DeviceGate({ token, status }: { token: string; status: "unclaimed" | "foreign-new" | "kicked" }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [claimed, setClaimed] = useState(false);

  useEffect(() => {
    if (status === "unclaimed") {
      startTransition(async () => {
        await claimDevice(token);
        router.refresh();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  if (status === "unclaimed") {
    return null;
  }

  if (status === "kicked") {
    return (
      <Shell>
        <h1 style={{ fontFamily: "Archivo, sans-serif", fontSize: "1.4rem", marginBottom: 12 }}>
          This link is now active on another device.
        </h1>
        <p style={{ color: "var(--muted)" }}>
          If you think this is a mistake, contact us and we&apos;ll send a fresh link.
        </p>
      </Shell>
    );
  }

  // foreign-new
  return (
    <Shell>
      <h1 style={{ fontFamily: "Archivo, sans-serif", fontSize: "1.4rem", marginBottom: 12 }}>
        This link is already in use on another device.
      </h1>
      {claimed ? (
        <p style={{ color: "var(--muted)" }}>Switching you over...</p>
      ) : (
        <>
          <p style={{ color: "var(--muted)", marginBottom: 20 }}>
            Continuing here will log out the other device.
          </p>
          <button
            className="btn btn-primary"
            disabled={isPending}
            onClick={() => {
              setClaimed(true);
              startTransition(async () => {
                await claimDevice(token);
                router.refresh();
              });
            }}
          >
            Continue here
          </button>
        </>
      )}
    </Shell>
  );
}
