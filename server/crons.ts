import { id } from "@instantdb/admin";

import { APP_CONFIG } from "../shared/appConfig.ts";
import {
  CI_CHECKOUTS_PER_ELECTRON_RELEASE,
  isUsageTrackingEnabled,
  parseGithubOwnerRepo,
  utcDayKey,
  utcDayStartMs,
} from "../shared/usageTracking.ts";
import { adminDb } from "./db.ts";
import { createPolarClient } from "./polar.ts";
import { POLAR_ENV } from "../shared/polarEnv.ts";
import { isSelfHosted } from "../shared/selfHosted.ts";

async function expireTrials(): Promise<void> {
  const now = Date.now();
  const data = await adminDb.query({ trialGrants: {} });
  const txs = data.trialGrants
    .filter((grant) => grant.expiredAt == null && grant.endsAt <= now)
    .map((grant) => adminDb.tx.trialGrants[grant.id].update({ expiredAt: now }));
  if (txs.length > 0) {
    await adminDb.transact(txs);
  }
}

async function deleteExpiredJoinCodes(): Promise<void> {
  const now = Date.now();
  const data = await adminDb.query({ joinCodes: {} });
  const txs = data.joinCodes
    .filter((code) => code.expiresAt <= now || code.useCount >= code.maxUses)
    .map((code) => adminDb.tx.joinCodes[code.id].delete());
  if (txs.length > 0) {
    await adminDb.transact(txs);
  }
}

type TrafficCloneDay = { timestamp: string; count: number; uniques: number };
type TrafficClonesResponse = { clones: TrafficCloneDay[] };
type WorkflowRunsResponse = {
  workflow_runs: Array<{ status: string; updated_at: string }>;
};

async function githubGet<T>(path: string, token: string): Promise<T> {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": `${APP_CONFIG.slug}-usage-sync`,
    },
  });
  if (!response.ok) {
    throw new Error(`GitHub API ${path} failed (${response.status})`);
  }
  return (await response.json()) as T;
}

async function syncGithubClones(): Promise<void> {
  if (!isUsageTrackingEnabled()) return;
  const token = process.env.GITHUB_TRAFFIC_TOKEN?.trim();
  if (!token) return;
  const parsed = parseGithubOwnerRepo(APP_CONFIG.github);
  if (!parsed) return;
  const traffic = await githubGet<TrafficClonesResponse>(
    `/repos/${parsed.owner}/${parsed.repo}/traffic/clones?per=day`,
    token,
  );
  for (const day of traffic.clones) {
    const dayKey = day.timestamp.slice(0, 10);
    const dayStart = utcDayStartMs(Date.parse(`${dayKey}T00:00:00.000Z`));
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;
    const createdMin = new Date(dayStart - 2 * 24 * 60 * 60 * 1000).toISOString();
    const createdMax = new Date(dayEnd + 2 * 24 * 60 * 60 * 1000).toISOString();
    const runs = await githubGet<WorkflowRunsResponse>(
      `/repos/${parsed.owner}/${parsed.repo}/actions/workflows/electron-release.yml/runs?per_page=50&created=${encodeURIComponent(`${createdMin}..${createdMax}`)}`,
      token,
    );
    let completed = 0;
    for (const run of runs.workflow_runs) {
      if (run.status !== "completed") continue;
      const finishedAt = Date.parse(run.updated_at);
      if (finishedAt >= dayStart && finishedAt < dayEnd) completed += 1;
    }
    const ciSubtracted = completed * CI_CHECKOUTS_PER_ELECTRON_RELEASE;
    const count = Math.max(0, day.count - ciSubtracted);
    const existing = await adminDb.query({
      githubCloneDays: { $: { where: { dayKey } } },
    });
    const rowId = existing.githubCloneDays[0]?.id ?? id();
    await adminDb.transact(
      adminDb.tx.githubCloneDays[rowId].update({
        dayKey,
        dayStartMs: dayStart,
        rawCount: day.count,
        ciSubtracted,
        count,
        uniques: day.uniques,
        syncedAt: Date.now(),
      }),
    );
  }
  void utcDayKey;
}

async function reconcilePolar(): Promise<void> {
  if (isSelfHosted()) return;
  if (!POLAR_ENV.organizationToken || POLAR_ENV.organizationToken === "self-hosted-disabled") {
    return;
  }
  const polar = createPolarClient();
  const result = await polar.subscriptions.list({ limit: 100 });
  for (const subscription of result.result.items) {
    const userId =
      typeof subscription.customer === "object" &&
      subscription.customer &&
      "externalId" in subscription.customer
        ? (subscription.customer.externalId as string | null)
        : null;
    if (!userId) continue;
    const existing = await adminDb.query({
      subscriptions: { $: { where: { polarId: subscription.id } } },
    });
    const rowId = existing.subscriptions[0]?.id ?? id();
    const toIso = (value: Date | string | null | undefined) => {
      if (!value) return undefined;
      return value instanceof Date ? value.toISOString() : value;
    };
    await adminDb.transact(
      adminDb.tx.subscriptions[rowId]
        .update({
          polarId: subscription.id,
          status: subscription.status,
          productId: subscription.productId,
          amount: subscription.amount ?? undefined,
          currency: subscription.currency ?? undefined,
          recurringInterval: subscription.recurringInterval ?? undefined,
          currentPeriodEnd: toIso(subscription.currentPeriodEnd),
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          canceledAt: toIso(subscription.canceledAt),
          endsAt: toIso(subscription.endsAt),
          updatedAt: Date.now(),
        })
        .link({ user: userId }),
    );
  }
}

export function startCrons(): void {
  const every = (ms: number, fn: () => Promise<void>, name: string) => {
    const run = async () => {
      try {
        await fn();
      } catch (error) {
        console.error(`cron ${name} failed`, error);
      }
    };
    void run();
    setInterval(() => void run(), ms);
  };
  every(5 * 60_000, expireTrials, "expireTrials");
  every(5 * 60_000, deleteExpiredJoinCodes, "deleteExpiredJoinCodes");
  every(24 * 60 * 60_000, syncGithubClones, "syncGithubClones");
  every(24 * 60 * 60_000, reconcilePolar, "reconcilePolar");
}
