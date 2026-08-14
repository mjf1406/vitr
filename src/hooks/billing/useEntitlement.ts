import { useMemo } from "react";

import type { SubscriptionSummary } from "@/components/billing/SubscriptionManagement";
import { db } from "@/lib/instant/db";
import { deriveEntitlement } from "@/lib/billing/entitlement";
import { queryMeta } from "@/lib/instant/queryMeta";

function toSubscriptionSummary(row: {
  status: string;
  productKey?: string;
  productName?: string;
  amount?: number;
  currency?: string;
  recurringInterval?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  startedAt?: string;
  cancelAtPeriodEnd: boolean;
  canceledAt?: string;
  endsAt?: string;
}): SubscriptionSummary {
  return {
    status: row.status,
    productKey: row.productKey ?? null,
    productName: row.productName ?? null,
    amount: row.amount ?? null,
    currency: row.currency ?? null,
    recurringInterval: row.recurringInterval ?? null,
    currentPeriodStart: row.currentPeriodStart ?? null,
    currentPeriodEnd: row.currentPeriodEnd ?? null,
    startedAt: row.startedAt ?? null,
    cancelAtPeriodEnd: row.cancelAtPeriodEnd,
    canceledAt: row.canceledAt ?? null,
    endsAt: row.endsAt ?? null,
  };
}

export function useEntitlement() {
  const { user, isLoading: isAuthLoading } = db.useAuth();
  const query = db.useQuery(
    user
      ? {
          trialGrants: { $: { where: { "user.id": user.id } } },
          subscriptions: { $: { where: { "user.id": user.id } } },
        }
      : null,
  );

  const raw = useMemo(() => {
    const grant = query.data?.trialGrants[0];
    const subscription = query.data?.subscriptions.find(
      (row) => row.status === "active" || row.status === "trialing",
    );
    return {
      trialEndsAt: (grant?.endsAt as number | undefined) ?? null,
      subscriptionStatus: subscription?.status ?? null,
      subscription: subscription ? toSubscriptionSummary(subscription) : null,
      productKey: subscription?.productKey ?? null,
    };
  }, [query.data]);

  const entitlement = useMemo(() => deriveEntitlement(raw), [raw]);

  return {
    data: raw,
    entitlement,
    ...queryMeta(query, isAuthLoading),
  };
}
