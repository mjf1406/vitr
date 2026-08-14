import { AdminApiError } from "@/lib/api/admin";

export function codeFromError(error: unknown): string | undefined {
  if (error instanceof AdminApiError) {
    return error.code;
  }
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string" && code.trim()) {
      return code;
    }
  }
  if (typeof error === "object" && error !== null && "data" in error) {
    const data = (error as { data?: { code?: string } }).data;
    if (typeof data?.code === "string" && data.code.trim()) {
      return data.code;
    }
  }
  return undefined;
}

export function messageFromError(
  error: unknown,
  fallback: string,
  rateLimitedMessage?: string,
): string {
  if (rateLimitedMessage !== undefined && codeFromError(error) === "RATE_LIMITED") {
    return rateLimitedMessage;
  }
  if (error instanceof AdminApiError && error.message.trim()) {
    return error.message;
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
}
