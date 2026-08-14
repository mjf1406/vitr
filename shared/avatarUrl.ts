/**
 * Sanitize avatar URLs for `<img src>`.
 * Allows HTTPS Google user-content hosts and Instant Storage URLs.
 */
function isPrivateOrLocalHost(host: string): boolean {
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "127.0.0.1" ||
    host === "::1"
  ) {
    return true;
  }
  const parts = host.split(".");
  if (parts.length !== 4) {
    return false;
  }
  const octets = parts.map((part) => Number(part));
  if (octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return false;
  }
  const [a, b] = octets;
  if (a === 10 || a === 127) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b !== undefined && b >= 16 && b <= 31) return true;
  return false;
}

export function sanitizeAvatarUrl(url: string | null | undefined): string | null {
  if (url === null || url === undefined) {
    return null;
  }
  const trimmed = url.trim();
  if (!trimmed) {
    return null;
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return null;
  }
  const host = parsed.hostname.toLowerCase();
  if (host === "googleusercontent.com" || host.endsWith(".googleusercontent.com")) {
    if (parsed.protocol !== "https:") {
      return null;
    }
    return parsed.toString();
  }
  if (isPrivateOrLocalHost(host)) {
    return parsed.toString();
  }
  if (
    host.includes("instantdb") ||
    host.includes("instant.db") ||
    host.endsWith(".s3.amazonaws.com")
  ) {
    return parsed.toString();
  }
  return null;
}
