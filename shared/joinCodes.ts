export const JOIN_CODE_LENGTH = 6;
export const JOIN_CODE_MAX_TTL_MS = 24 * 60 * 60 * 1000;
export const JOIN_CODE_MIN_USES = 1;
export const JOIN_CODE_MAX_USES = 100;
export const JOIN_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function normalizeJoinCode(code: string): string {
  const normalized = code
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  if (normalized.length !== JOIN_CODE_LENGTH) {
    throw new Error("Invite code must be 6 characters");
  }
  return normalized;
}

export function normalizeMaxUses(maxUses: number): number {
  if (!Number.isInteger(maxUses) || maxUses < JOIN_CODE_MIN_USES || maxUses > JOIN_CODE_MAX_USES) {
    throw new Error(
      `Uses must be an integer between ${JOIN_CODE_MIN_USES} and ${JOIN_CODE_MAX_USES}`,
    );
  }
  return maxUses;
}

export function normalizeTtlMs(ttlMs: number): number {
  if (!Number.isFinite(ttlMs) || ttlMs <= 0 || ttlMs > JOIN_CODE_MAX_TTL_MS) {
    throw new Error("Expiry must be between 1 second and 24 hours");
  }
  return ttlMs;
}

export function randomJoinCode(): string {
  const bytes = new Uint8Array(JOIN_CODE_LENGTH);
  crypto.getRandomValues(bytes);
  let result = "";
  for (const byte of bytes) {
    result += JOIN_CODE_ALPHABET[byte % JOIN_CODE_ALPHABET.length];
  }
  return result;
}
