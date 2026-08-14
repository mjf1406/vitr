import { useCallback, useEffect, useState } from "react";

import { adminPost } from "@/lib/api/admin";
import { db } from "@/lib/instant/db";

export const billingHistoryQueryKey = ["billing", "orderHistory"] as const;

const PAGE_SIZE = 10;

type OrderPage = {
  items: Array<{
    id: string;
    description: string;
    status: string;
    createdAt: string;
    totalAmount: number;
    currency: string;
    paid: boolean;
  }>;
  page: number;
  maxPage: number;
};

export function useBillingHistory() {
  const { user, isLoading: isAuthLoading } = db.useAuth();
  const [pages, setPages] = useState<Array<OrderPage>>([]);
  const [isPending, setIsPending] = useState(true);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
  const [isError, setIsError] = useState(false);

  const loadPage = useCallback(async (page: number, append: boolean) => {
    const result = await adminPost<OrderPage>("/api/billing/orders", { page, limit: PAGE_SIZE });
    setPages((prev) => (append ? [...prev, result] : [result]));
    return result;
  }, []);

  useEffect(() => {
    if (isAuthLoading || !user) {
      setIsPending(isAuthLoading);
      return;
    }
    let cancelled = false;
    setIsPending(true);
    void loadPage(1, false)
      .catch(() => {
        if (!cancelled) setIsError(true);
      })
      .finally(() => {
        if (!cancelled) setIsPending(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthLoading, loadPage, user]);

  const lastPage = pages[pages.length - 1];
  const hasNextPage = lastPage ? lastPage.page < lastPage.maxPage : false;

  const fetchNextPage = useCallback(async () => {
    if (!lastPage || !hasNextPage) return;
    setIsFetchingNextPage(true);
    try {
      await loadPage(lastPage.page + 1, true);
    } catch {
      setIsError(true);
    } finally {
      setIsFetchingNextPage(false);
    }
  }, [hasNextPage, lastPage, loadPage]);

  return {
    items: pages.flatMap((page) => page.items),
    isPending: isAuthLoading || isPending,
    isAuthLoading,
    isError,
    refetch: () => loadPage(1, false),
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  };
}
