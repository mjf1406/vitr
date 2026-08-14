import { AppError } from "./errors.ts";
import { adminDb } from "./db.ts";
import { isSelfHosted } from "../shared/selfHosted.ts";

const ACTIVE_STATUSES = new Set(["active", "trialing"]);

export async function assertEntitled(userId: string): Promise<void> {
  if (isSelfHosted()) {
    return;
  }

  const data = await adminDb.query({
    subscriptions: {
      $: { where: { "user.id": userId } },
    },
    trialGrants: {
      $: { where: { "user.id": userId } },
    },
  });

  const subscription = data.subscriptions[0];
  if (subscription && ACTIVE_STATUSES.has(subscription.status)) {
    return;
  }

  const grant = data.trialGrants[0];
  if (grant && grant.expiredAt == null && grant.endsAt > Date.now()) {
    return;
  }

  throw new AppError(
    "SUBSCRIPTION_REQUIRED",
    "Subscription required. Your free trial has ended.",
    402,
  );
}

export async function getEntitlement(userId: string) {
  if (isSelfHosted()) {
    return {
      trialEndsAt: null as number | null,
      subscriptionStatus: "active",
      currentPeriodEnd: null as string | null,
      productKey: "selfHosted",
      subscription: null,
    };
  }

  const data = await adminDb.query({
    subscriptions: {
      $: { where: { "user.id": userId } },
    },
    trialGrants: {
      $: { where: { "user.id": userId } },
    },
  });

  const grant = data.trialGrants[0];
  const subscription = data.subscriptions[0] ?? null;
  const summary = subscription
    ? {
        status: subscription.status,
        productKey: subscription.productKey ?? null,
        productName: subscription.productName ?? null,
        amount: subscription.amount ?? null,
        currency: subscription.currency ?? null,
        recurringInterval: subscription.recurringInterval ?? null,
        currentPeriodStart: subscription.currentPeriodStart ?? null,
        currentPeriodEnd: subscription.currentPeriodEnd ?? null,
        startedAt: subscription.startedAt ?? null,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        canceledAt: subscription.canceledAt ?? null,
        endsAt: subscription.endsAt ?? null,
      }
    : null;

  return {
    trialEndsAt: grant?.endsAt ?? null,
    subscriptionStatus: subscription?.status ?? null,
    currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
    productKey: summary?.productKey ?? null,
    subscription: summary,
  };
}
