import { Hono } from "hono";
import { id } from "@instantdb/admin";

import {
  demoUsageStatsSummary,
  emptyOsCounts,
  emptyPeriodCounts,
  emptyUsageStatsSummary,
  isUsageTrackingDemo,
  isUsageTrackingEnabled,
  periodBounds,
  pickChip,
  STATS_PERIODS,
  type DesktopOs,
  type StatsPeriod,
  type UsageEventKind,
} from "../../shared/usageTracking.ts";
import { requireUser } from "../auth.ts";
import { adminDb } from "../db.ts";
import { jsonError, readJson } from "../errors.ts";
import { consumeRateLimit } from "../rateLimit.ts";

export const usageRoutes = new Hono();

function inPeriod(createdAt: number, period: StatsPeriod, now: number): boolean {
  const bounds = periodBounds(period, now);
  if (!bounds) return true;
  if (bounds.lower && createdAt < bounds.lower.key) return false;
  if (bounds.upper && createdAt >= bounds.upper.key) return false;
  return true;
}

usageRoutes.get("/summary", async (c) => {
  try {
    await requireUser(c.req.raw);
    if (isUsageTrackingDemo()) {
      return c.json(demoUsageStatsSummary());
    }
    if (!isUsageTrackingEnabled()) {
      return c.json(emptyUsageStatsSummary());
    }
    const now = Date.now();
    const [events, clones] = await Promise.all([
      adminDb.query({ anonymousUsageEvents: {} }),
      adminDb.query({ githubCloneDays: {} }),
    ]);
    const downloads = emptyPeriodCounts();
    const selfHostClicks = emptyPeriodCounts();
    const clonesCounts = emptyPeriodCounts();
    const downloadsByOs = {
      today: emptyOsCounts(),
      week: emptyOsCounts(),
      twoWeeks: emptyOsCounts(),
      month: emptyOsCounts(),
      year: emptyOsCounts(),
      allTime: emptyOsCounts(),
    };
    for (const period of STATS_PERIODS) {
      for (const event of events.anonymousUsageEvents) {
        if (!inPeriod(event.createdAt, period, now)) continue;
        if (event.kind === "desktop_download") {
          downloads[period] += 1;
          if (event.os === "windows" || event.os === "mac" || event.os === "ubuntu") {
            downloadsByOs[period][event.os] += 1;
          }
        }
        if (event.kind === "self_host_click") {
          selfHostClicks[period] += 1;
        }
      }
      for (const day of clones.githubCloneDays) {
        if (!inPeriod(day.dayStartMs, period, now)) continue;
        clonesCounts[period] += day.count;
      }
    }
    return c.json({
      enabled: true,
      downloads,
      downloadsByOs,
      selfHostClicks,
      clones: clonesCounts,
      downloadChip: pickChip(downloads),
      selfHostChip: pickChip(selfHostClicks),
    });
  } catch (error) {
    return jsonError(error);
  }
});

usageRoutes.post("/track", async (c) => {
  try {
    const user = await requireUser(c.req.raw);
    const body = await readJson<{ kind: UsageEventKind; os?: DesktopOs }>(c.req.raw);
    if (body.kind === "desktop_download") {
      consumeRateLimit("usageTrackDownload", user.id);
      consumeRateLimit("usageTrackDownloadGlobal", "global");
    } else {
      consumeRateLimit("usageTrackSelfHost", user.id);
      consumeRateLimit("usageTrackSelfHostGlobal", "global");
    }
    if (!isUsageTrackingEnabled()) {
      return c.json({ ok: true });
    }
    await adminDb.transact(
      adminDb.tx.anonymousUsageEvents[id()].update({
        kind: body.kind,
        os: body.os,
        createdAt: Date.now(),
      }),
    );
    return c.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
});
