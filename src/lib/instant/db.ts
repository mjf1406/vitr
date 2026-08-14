import { init } from "@instantdb/react";

import schema from "../../../instant.schema.ts";
import { readViteEnv } from "@/lib/runtimeEnv";

function resolveAppId(): string {
  return readViteEnv("VITE_INSTANT_APP_ID") ?? "00000000-0000-0000-0000-000000000000";
}

function resolveApiUri(): string | undefined {
  const configured = readViteEnv("VITE_INSTANT_API_URI");
  const selfHosted = readViteEnv("VITE_SELF_HOSTED") === "true";
  if (selfHosted && typeof window !== "undefined") {
    const configuredUrl = configured ? safeUrl(configured) : null;
    const port = configuredUrl?.port || "8888";
    const protocol = window.location.protocol === "https:" ? "https:" : "http:";
    return `${protocol}//${window.location.hostname}:${port}`;
  }
  return configured;
}

function safeUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

const apiURI = resolveApiUri();

export const db = init({
  appId: resolveAppId(),
  schema,
  ...(apiURI ? { apiURI } : {}),
});
