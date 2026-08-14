/**
 * Normalize an email for trial-grant identity.
 * Applies Unicode NFKC, lowercases, and trims. Rejects (returns null) when the
 * local part contains non-ASCII after NFKC or the address is malformed.
 * Dot and `+tag` stripping apply only to gmail.com / googlemail.com.
 */
export function normalizeEmail(email: string): string | null {
  const trimmed = email.normalize("NFKC").trim().toLowerCase();
  const at = trimmed.lastIndexOf("@");
  if (at <= 0 || at === trimmed.length - 1) {
    return null;
  }
  let local = trimmed.slice(0, at);
  let domain = trimmed.slice(at + 1);

  if (!local || !domain || !domain.includes(".")) {
    return null;
  }
  if (hasNonAscii(local) || hasNonAscii(domain)) {
    return null;
  }

  if (domain === "gmail.com" || domain === "googlemail.com") {
    const plus = local.indexOf("+");
    if (plus >= 0) {
      local = local.slice(0, plus);
    }
    local = local.replaceAll(".", "");
    if (!local) {
      return null;
    }
    return `${local}@gmail.com`;
  }

  return `${local}@${domain}`;
}

function hasNonAscii(value: string): boolean {
  for (const char of value) {
    if (char.charCodeAt(0) > 0x7f) {
      return true;
    }
  }
  return false;
}

export const MS_PER_DAY = 24 * 60 * 60 * 1000;
