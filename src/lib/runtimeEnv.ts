type VitePublicEnvKey =
  | "VITE_INSTANT_APP_ID"
  | "VITE_INSTANT_API_URI"
  | "VITE_ADMIN_URL"
  | "VITE_INSTANT_GOOGLE_CLIENT_NAME"
  | "VITE_CLASS_PRESENCE_ENABLED"
  | "VITE_SELF_HOSTED"
  | "VITE_APP_VERSION";

type SelfHostRuntimeEnv = Partial<Record<VitePublicEnvKey, string>>;

declare global {
  interface Window {
    __SELF_HOST_ENV__?: SelfHostRuntimeEnv;
  }
}

/**
 * Prefer Docker/nginx-injected `window.__SELF_HOST_ENV__` (self-host),
 * then fall back to Vite build-time `import.meta.env`.
 */
export function readViteEnv(key: VitePublicEnvKey): string | undefined {
  const runtime = typeof window !== "undefined" ? window.__SELF_HOST_ENV__?.[key] : undefined;
  if (typeof runtime === "string" && runtime.length > 0) {
    return runtime;
  }
  const baked = import.meta.env[key];
  return typeof baked === "string" && baked.length > 0 ? baked : undefined;
}

export function isSelfHostedClient(): boolean {
  return readViteEnv("VITE_SELF_HOSTED") === "true";
}
