import { db } from "@/lib/instant/db";
import { readViteEnv } from "@/lib/runtimeEnv";

export class AdminApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly data: { code?: string; message?: string };

  constructor(status: number, data: { code?: string; message?: string }) {
    super(data.message ?? "Request failed");
    this.name = "AdminApiError";
    this.code = data.code ?? "ERROR";
    this.status = status;
    this.data = data;
  }
}

function resolveAdminUrl(): string {
  const configured = readViteEnv("VITE_ADMIN_URL");
  const selfHosted = readViteEnv("VITE_SELF_HOSTED") === "true";
  if (selfHosted && typeof window !== "undefined") {
    const configuredUrl = configured ? new URL(configured) : null;
    const port = configuredUrl?.port || "8787";
    const protocol = window.location.protocol === "https:" ? "https:" : "http:";
    return `${protocol}//${window.location.hostname}:${port}`;
  }
  if (configured) {
    return configured.replace(/\/$/, "");
  }
  if (typeof window !== "undefined") {
    return "http://localhost:8787";
  }
  return "http://localhost:8787";
}

export async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const user = await db.getAuth();
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  if (user?.refresh_token) {
    headers.set("Authorization", `Bearer ${user.refresh_token}`);
  }
  const response = await fetch(`${resolveAdminUrl()}${path}`, {
    ...init,
    headers,
  });
  const data = (await response.json().catch(() => ({}))) as { code?: string; message?: string };
  if (!response.ok) {
    throw new AdminApiError(response.status, data);
  }
  return data as T;
}

export function adminPost<T>(path: string, body?: unknown): Promise<T> {
  return adminFetch<T>(path, {
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function adminGet<T>(path: string): Promise<T> {
  return adminFetch<T>(path, { method: "GET" });
}
