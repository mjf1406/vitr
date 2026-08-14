import { Hono } from "hono";
import { Polar } from "@polar-sh/sdk";
import { validateEvent, WebhookVerificationError } from "@polar-sh/sdk/webhooks";
import { id } from "@instantdb/admin";

import {
  assertConfiguredProduct,
  resolveAppOrigin,
  resolveAppUrl,
} from "../../shared/billingGuards.ts";
import { isAlreadyCanceledError, throwBillingError } from "../../shared/polarErrors.ts";
import { polarEnvPresence } from "../../shared/polarEnv.ts";
import { isSelfHosted } from "../../shared/selfHosted.ts";
import { requireUser } from "../auth.ts";
import { adminDb } from "../db.ts";
import { AppError, jsonError, readJson } from "../errors.ts";
import { consumeRateLimit } from "../rateLimit.ts";
import { assertCloudBilling, createPolarClient, POLAR_ENV } from "../polar.ts";

export const billingRoutes = new Hono();

async function upsertSubscriptionFromPolar(
  userId: string,
  subscription: {
    id: string;
    status: string;
    productId: string;
    amount?: number | null;
    currency?: string | null;
    recurringInterval?: string | null;
    currentPeriodStart?: Date | string | null;
    currentPeriodEnd?: Date | string | null;
    startedAt?: Date | string | null;
    cancelAtPeriodEnd: boolean;
    canceledAt?: Date | string | null;
    endsAt?: Date | string | null;
    product?: { name?: string | null } | null;
  },
) {
  const existing = await adminDb.query({
    subscriptions: { $: { where: { polarId: subscription.id } } },
  });
  const rowId = existing.subscriptions[0]?.id ?? id();
  const toIso = (value: Date | string | null | undefined) => {
    if (!value) return null;
    return value instanceof Date ? value.toISOString() : value;
  };
  const productKey =
    subscription.productId === POLAR_ENV.monthlyProductId
      ? "proMonthly"
      : subscription.productId === POLAR_ENV.yearlyProductId
        ? "proYearly"
        : undefined;
  await adminDb.transact(
    adminDb.tx.subscriptions[rowId]
      .update({
        polarId: subscription.id,
        status: subscription.status,
        productId: subscription.productId,
        productKey,
        productName: subscription.product?.name ?? undefined,
        amount: subscription.amount ?? undefined,
        currency: subscription.currency ?? undefined,
        recurringInterval: subscription.recurringInterval ?? undefined,
        currentPeriodStart: toIso(subscription.currentPeriodStart) ?? undefined,
        currentPeriodEnd: toIso(subscription.currentPeriodEnd) ?? undefined,
        startedAt: toIso(subscription.startedAt) ?? undefined,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        canceledAt: toIso(subscription.canceledAt) ?? undefined,
        endsAt: toIso(subscription.endsAt) ?? undefined,
        updatedAt: Date.now(),
      })
      .link({ user: userId }),
  );
}

async function currentSubscription(polar: Polar, userId: string) {
  const list = await polar.subscriptions.list({
    externalCustomerId: userId,
    limit: 10,
  });
  return (
    list.result.items.find((item) => item.status === "active" || item.status === "trialing") ??
    list.result.items[0] ??
    null
  );
}

billingRoutes.post("/checkout", async (c) => {
  try {
    assertCloudBilling();
    const user = await requireUser(c.req.raw);
    consumeRateLimit("billingCheckout", user.id);
    consumeRateLimit("billingCheckoutGlobal", "global");
    if (!user.email) {
      throw new AppError("UNAUTHENTICATED", "Not authenticated", 401);
    }
    const body = await readJson<{ productId: string }>(c.req.raw);
    assertConfiguredProduct(body.productId);
    const polar = createPolarClient();
    try {
      const checkout = await polar.checkouts.create({
        products: [body.productId],
        externalCustomerId: user.id,
        customerEmail: user.email,
        successUrl: resolveAppUrl("/billing"),
        embedOrigin: resolveAppOrigin(),
      });
      return c.json({ url: checkout.url });
    } catch (error) {
      throwBillingError(error, "CHECKOUT_FAILED", "Could not start checkout", "createCheckoutLink");
    }
  } catch (error) {
    return jsonError(error);
  }
});

billingRoutes.post("/portal", async (c) => {
  try {
    assertCloudBilling();
    const user = await requireUser(c.req.raw);
    consumeRateLimit("billingPortal", user.id);
    consumeRateLimit("billingPortalGlobal", "global");
    const polar = createPolarClient();
    try {
      const session = await polar.customerSessions.create({
        externalCustomerId: user.id,
        returnUrl: resolveAppUrl("/billing"),
      });
      return c.json({ url: session.customerPortalUrl });
    } catch (error) {
      throwBillingError(
        error,
        "PORTAL_FAILED",
        "Could not open Polar portal",
        "generateCustomerPortalUrl",
      );
    }
  } catch (error) {
    return jsonError(error);
  }
});

billingRoutes.post("/cancel", async (c) => {
  try {
    assertCloudBilling();
    const user = await requireUser(c.req.raw);
    consumeRateLimit("billingCancel", user.id);
    consumeRateLimit("billingCancelGlobal", "global");
    const body = await readJson<{ revokeImmediately?: boolean }>(c.req.raw);
    const polar = createPolarClient();
    try {
      const current = await currentSubscription(polar, user.id);
      if (!current) {
        return c.json({ ok: true });
      }
      if (current.cancelAtPeriodEnd && !body.revokeImmediately) {
        return c.json({ ok: true });
      }
      await polar.subscriptions.update({
        id: current.id,
        subscriptionUpdate: body.revokeImmediately
          ? { cancelAtPeriodEnd: false }
          : { cancelAtPeriodEnd: true },
      });
      if (body.revokeImmediately) {
        await polar.subscriptions.revoke({ id: current.id });
      }
      return c.json({ ok: true });
    } catch (error) {
      if (isAlreadyCanceledError(error)) {
        return c.json({ ok: true });
      }
      throwBillingError(
        error,
        "CANCEL_FAILED",
        "Could not cancel subscription",
        "cancelSubscription",
      );
    }
  } catch (error) {
    return jsonError(error);
  }
});

billingRoutes.post("/change", async (c) => {
  try {
    assertCloudBilling();
    const user = await requireUser(c.req.raw);
    consumeRateLimit("billingChange", user.id);
    consumeRateLimit("billingChangeGlobal", "global");
    const body = await readJson<{ productId: string }>(c.req.raw);
    assertConfiguredProduct(body.productId);
    const polar = createPolarClient();
    try {
      const current = await currentSubscription(polar, user.id);
      if (!current) {
        throw new AppError("NOT_FOUND", "No active subscription");
      }
      await polar.subscriptions.update({
        id: current.id,
        subscriptionUpdate: { productId: body.productId },
      });
      return c.json({ ok: true });
    } catch (error) {
      throwBillingError(error, "CHANGE_FAILED", "Could not change plan", "changeSubscription");
    }
  } catch (error) {
    return jsonError(error);
  }
});

billingRoutes.post("/orders", async (c) => {
  try {
    assertCloudBilling();
    const user = await requireUser(c.req.raw);
    consumeRateLimit("billingOrders", user.id);
    consumeRateLimit("billingOrdersGlobal", "global");
    const body = await readJson<{ page?: number; limit?: number }>(c.req.raw);
    const page = Math.max(1, body.page ?? 1);
    const limit = Math.min(50, Math.max(1, body.limit ?? 10));
    const polar = createPolarClient();
    try {
      const result = await polar.orders.list({
        externalCustomerId: user.id,
        page,
        limit,
        sorting: ["-created_at"],
      });
      return c.json({
        items: result.result.items.map((order) => ({
          id: order.id,
          description: order.description || order.product?.name || "Order",
          status: order.status,
          createdAt:
            order.createdAt instanceof Date
              ? order.createdAt.toISOString()
              : String(order.createdAt),
          totalAmount: order.totalAmount,
          currency: order.currency,
          paid: order.paid,
        })),
        page,
        maxPage: result.result.pagination.maxPage,
        totalCount: result.result.pagination.totalCount,
      });
    } catch (error) {
      throwBillingError(error, "ORDERS_FAILED", "Could not load order history", "listOrders");
    }
  } catch (error) {
    return jsonError(error);
  }
});

billingRoutes.get("/products", async (c) => {
  try {
    if (isSelfHosted()) {
      return c.json({ proMonthly: null, proYearly: null });
    }
    const polar = createPolarClient();
    const [monthly, yearly] = await Promise.all([
      POLAR_ENV.monthlyProductId
        ? polar.products.get({ id: POLAR_ENV.monthlyProductId }).catch(() => null)
        : null,
      POLAR_ENV.yearlyProductId
        ? polar.products.get({ id: POLAR_ENV.yearlyProductId }).catch(() => null)
        : null,
    ]);
    return c.json({ proMonthly: monthly, proYearly: yearly });
  } catch (error) {
    return jsonError(error);
  }
});

billingRoutes.get("/health", async (c) => {
  try {
    const user = await requireUser(c.req.raw);
    const profile = await adminDb.query({
      profiles: { $: { where: { "$user.id": user.id } } },
    });
    if (!profile.profiles[0]?.isAppAdmin) {
      throw new AppError("FORBIDDEN", "Admin access required", 403);
    }
    return c.json(polarEnvPresence());
  } catch (error) {
    return jsonError(error);
  }
});

billingRoutes.post("/webhook", async (c) => {
  const body = await c.req.text();
  let event: ReturnType<typeof validateEvent>;
  try {
    event = validateEvent(
      body,
      {
        "webhook-id": c.req.header("webhook-id") ?? "",
        "webhook-timestamp": c.req.header("webhook-timestamp") ?? "",
        "webhook-signature": c.req.header("webhook-signature") ?? "",
      },
      POLAR_ENV.webhookSecret,
    );
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      return c.json({ received: false }, 403);
    }
    throw error;
  }

  if (
    event.type === "subscription.created" ||
    event.type === "subscription.updated" ||
    event.type === "subscription.active" ||
    event.type === "subscription.canceled" ||
    event.type === "subscription.uncanceled" ||
    event.type === "subscription.revoked" ||
    event.type === "subscription.past_due"
  ) {
    const subscription = event.data;
    const userId =
      typeof subscription.customer === "object" &&
      subscription.customer &&
      "externalId" in subscription.customer
        ? (subscription.customer.externalId as string | null)
        : null;
    if (userId) {
      await upsertSubscriptionFromPolar(userId, subscription);
    }
  }

  return c.json({ received: true });
});
