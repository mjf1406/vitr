import { init, id } from "@instantdb/admin";

import schema from "../instant.schema.ts";

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
}

export function instantAppId(): string {
  return requiredEnv("INSTANT_APP_ID");
}

export function instantAdminToken(): string {
  return requiredEnv("INSTANT_APP_ADMIN_TOKEN");
}

export function instantApiUri(): string | undefined {
  return process.env.INSTANT_API_URI?.trim() || undefined;
}

export const adminDb = init({
  appId: instantAppId(),
  adminToken: instantAdminToken(),
  schema,
  ...(instantApiUri() ? { apiURI: instantApiUri() } : {}),
});

/** Instant's transact chunks don't share a single TS union across entities. */
export async function adminTransact(chunks: ReadonlyArray<unknown>): Promise<void> {
  if (chunks.length === 0) return;
  await adminDb.transact(chunks as never);
}

export function firstLinkedId(value: unknown): string | undefined {
  if (!value) return undefined;
  if (Array.isArray(value)) {
    const first = value[0] as { id?: string } | undefined;
    return first?.id;
  }
  if (typeof value === "object" && value !== null && "id" in value) {
    const idValue = (value as { id?: unknown }).id;
    return typeof idValue === "string" ? idValue : undefined;
  }
  return undefined;
}

export { id };
