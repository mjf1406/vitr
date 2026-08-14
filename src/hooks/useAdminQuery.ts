import { useCallback, useEffect, useState } from "react";

import { adminGet } from "@/lib/api/admin";
import { db } from "@/lib/instant/db";

export function useAdminQuery<T>(path: string | null) {
  const { user, isLoading: isAuthLoading } = db.useAuth();
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<Error | null>(null);
  const [isPending, setIsPending] = useState(Boolean(path));
  const [tick, setTick] = useState(0);
  const refetch = useCallback(() => {
    setTick((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!path || isAuthLoading || !user) {
      setIsPending(isAuthLoading);
      if (!user && !isAuthLoading) {
        setData(undefined);
      }
      return;
    }
    let cancelled = false;
    setIsPending(true);
    void adminGet<T>(path)
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setError(null);
        }
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setError(caught instanceof Error ? caught : new Error("Request failed"));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsPending(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [path, user, isAuthLoading, tick]);

  return {
    data,
    error,
    isPending: isAuthLoading || isPending,
    isLoading: isAuthLoading || isPending,
    isError: Boolean(error),
    isAuthLoading,
    refetch,
  };
}
