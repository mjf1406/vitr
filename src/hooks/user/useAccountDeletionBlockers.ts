import { useMemo } from "react";

import { db } from "@/lib/instant/db";
import { isSelfHosted } from "@/lib/selfHosted";

export function useAccountDeletionBlockers() {
  const { user, isLoading: isAuthLoading } = db.useAuth();
  const query = db.useQuery(
    user
      ? {
          classes: { $: { where: { "owner.id": user.id } } },
          subscriptions: { $: { where: { "user.id": user.id } } },
        }
      : null,
  );

  const data = useMemo(() => {
    const blockers: Array<"owns_classes" | "active_subscription"> = [];
    if (!query.data) return [];
    if (query.data.classes.length > 0) {
      blockers.push("owns_classes");
    }
    if (
      !isSelfHosted() &&
      query.data.subscriptions.some(
        (sub: { status?: string }) => sub.status === "active" || sub.status === "trialing",
      )
    ) {
      blockers.push("active_subscription");
    }
    return blockers;
  }, [query.data]);

  const isPending = isAuthLoading || query.isLoading;
  return {
    data,
    isPending,
    isLoading: isPending,
    isError: Boolean(query.error),
    error: query.error,
  };
}
