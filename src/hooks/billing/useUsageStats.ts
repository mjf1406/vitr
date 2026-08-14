import { useAdminQuery } from "@/hooks/useAdminQuery";
import type { UsageStatsSummary } from "../../../shared/usageTracking";

export const USAGE_STATS_GC_TIME = 5 * 60 * 1000;

export function useUsageStats() {
  return useAdminQuery<UsageStatsSummary>("/api/usage/summary");
}

export type { UsageStatsSummary };
