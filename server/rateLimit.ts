type BucketState = {
  tokens: number;
  updatedAt: number;
};

export type RateLimitSpec = {
  rate: number;
  periodMs: number;
  capacity: number;
};

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

export const RATE_LIMITS = {
  classCreate: { rate: 10, periodMs: HOUR, capacity: 3 },
  classCreateGlobal: { rate: 60, periodMs: MINUTE, capacity: 20 },
  classUpdate: { rate: 30, periodMs: MINUTE, capacity: 5 },
  classArchive: { rate: 20, periodMs: MINUTE, capacity: 5 },
  classDelete: { rate: 10, periodMs: HOUR, capacity: 2 },
  classTransferOwnership: { rate: 10, periodMs: HOUR, capacity: 2 },
  accountDelete: { rate: 5, periodMs: HOUR, capacity: 1 },
  joinCodeCreate: { rate: 30, periodMs: HOUR, capacity: 5 },
  joinCodeRevoke: { rate: 60, periodMs: HOUR, capacity: 10 },
  joinCodeRedeemShort: { rate: 5, periodMs: 5 * MINUTE, capacity: 5 },
  joinCodeRedeemHourly: { rate: 30, periodMs: HOUR, capacity: 30 },
  joinCodeRedeemGlobal: { rate: 200, periodMs: MINUTE, capacity: 50 },
  joinCodeRedeemFailure: { rate: 10, periodMs: HOUR, capacity: 5 },
  memberSuspend: { rate: 60, periodMs: HOUR, capacity: 10 },
  memberRemove: { rate: 60, periodMs: HOUR, capacity: 10 },
  memberSetRole: { rate: 60, periodMs: HOUR, capacity: 10 },
  memberSetGuardianLinks: { rate: 60, periodMs: HOUR, capacity: 10 },
  fileFinalize: { rate: 30, periodMs: HOUR, capacity: 10 },
  fileFinalizeGlobal: { rate: 120, periodMs: MINUTE, capacity: 40 },
  ensureTrialGrant: { rate: 20, periodMs: HOUR, capacity: 5 },
  billingCheckout: { rate: 10, periodMs: HOUR, capacity: 3 },
  billingCheckoutGlobal: { rate: 60, periodMs: MINUTE, capacity: 20 },
  billingPortal: { rate: 20, periodMs: HOUR, capacity: 5 },
  billingPortalGlobal: { rate: 60, periodMs: MINUTE, capacity: 20 },
  billingChange: { rate: 10, periodMs: HOUR, capacity: 3 },
  billingChangeGlobal: { rate: 60, periodMs: MINUTE, capacity: 20 },
  billingCancel: { rate: 10, periodMs: HOUR, capacity: 3 },
  billingCancelGlobal: { rate: 60, periodMs: MINUTE, capacity: 20 },
  billingOrders: { rate: 60, periodMs: HOUR, capacity: 20 },
  billingOrdersGlobal: { rate: 120, periodMs: MINUTE, capacity: 40 },
  usageTrackDownload: { rate: 10, periodMs: HOUR, capacity: 5 },
  usageTrackDownloadGlobal: { rate: 120, periodMs: MINUTE, capacity: 40 },
  usageTrackSelfHost: { rate: 5, periodMs: HOUR, capacity: 3 },
  usageTrackSelfHostGlobal: { rate: 60, periodMs: MINUTE, capacity: 20 },
  feedbackSubmitDaily: { rate: 10, periodMs: DAY, capacity: 10 },
  feedbackSubmitWeekly: { rate: 20, periodMs: WEEK, capacity: 20 },
} as const satisfies Record<string, RateLimitSpec>;

export type RateLimitName = keyof typeof RATE_LIMITS;

const buckets = new Map<string, BucketState>();

export function consumeRateLimit(name: RateLimitName, key: string): void {
  const spec = RATE_LIMITS[name];
  const id = `${name}:${key}`;
  const now = Date.now();
  const existing = buckets.get(id);
  const refillPerMs = spec.rate / spec.periodMs;
  let tokens: number = spec.capacity;
  let updatedAt = now;
  if (existing) {
    const elapsed = Math.max(0, now - existing.updatedAt);
    tokens = Math.min(spec.capacity, existing.tokens + elapsed * refillPerMs);
    updatedAt = now;
  }
  if (tokens < 1) {
    const error = new Error("Too many requests. Please try again later.");
    (error as Error & { code: string; status: number }).code = "RATE_LIMITED";
    (error as Error & { code: string; status: number }).status = 429;
    throw error;
  }
  buckets.set(id, { tokens: tokens - 1, updatedAt });
}
