import { useEffect, useMemo, useRef, useState } from "react";

import { db } from "@/lib/instant/db";

export type ConnectionStatus = "connected" | "connecting" | "reconnecting" | "offline";

const DISCONNECTED_DEBOUNCE_MS = 2000;

type InstantConnectionStatus = "connecting" | "opened" | "authenticated" | "closed" | "errored";

export function useConnectionStatus() {
  const [raw, setRaw] = useState<InstantConnectionStatus>("connecting");
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const hasEverConnectedRef = useRef(false);
  const hasRealOutageRef = useRef(false);
  const disconnectTimerRef = useRef<number | null>(null);
  const [restoredNonce, setRestoredNonce] = useState(0);

  useEffect(() => {
    const subscribe = (
      db as unknown as {
        subscribeConnectionStatus?: (cb: (status: InstantConnectionStatus) => void) => () => void;
      }
    ).subscribeConnectionStatus;
    if (!subscribe) {
      setStatus("connected");
      return;
    }
    return subscribe((next) => {
      setRaw(next);
    });
  }, []);

  useEffect(() => {
    if (disconnectTimerRef.current !== null) {
      window.clearTimeout(disconnectTimerRef.current);
      disconnectTimerRef.current = null;
    }
    const connected = raw === "authenticated" || raw === "opened";
    if (connected) {
      if (hasRealOutageRef.current) {
        setRestoredNonce((n) => n + 1);
      }
      hasRealOutageRef.current = false;
      hasEverConnectedRef.current = true;
      setStatus("connected");
      return;
    }
    if (!hasEverConnectedRef.current) {
      setStatus("connecting");
      return;
    }
    setStatus("reconnecting");
    disconnectTimerRef.current = window.setTimeout(() => {
      hasRealOutageRef.current = true;
      setStatus("offline");
      disconnectTimerRef.current = null;
    }, DISCONNECTED_DEBOUNCE_MS);
  }, [raw]);

  return useMemo(
    () => ({
      status,
      restoredNonce,
      connectionState: { status: raw },
    }),
    [status, restoredNonce, raw],
  );
}
