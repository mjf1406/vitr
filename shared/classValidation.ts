import { APP_CONFIG } from "../shared/appConfig.ts";

export const MIN_YEAR = 1900;
export const MAX_YEAR = 2100;
export const MAX_NAME_LENGTH = 100;
export const MAX_DESCRIPTION_LENGTH = 500;
export const MAX_ICON_LENGTH = 32;

export function normalizeClassName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Class name is required");
  }
  if (trimmed.length > MAX_NAME_LENGTH) {
    throw new Error(`Class name must be at most ${MAX_NAME_LENGTH} characters`);
  }
  return trimmed;
}

export function normalizeClassYear(year: number): number {
  if (!Number.isInteger(year) || year < MIN_YEAR || year > MAX_YEAR) {
    throw new Error(`Year must be an integer between ${MIN_YEAR} and ${MAX_YEAR}`);
  }
  return year;
}

export function normalizeClassDescription(description: string | undefined): string | undefined {
  if (description === undefined) {
    return undefined;
  }
  const trimmed = description.trim();
  if (!trimmed) {
    return undefined;
  }
  if (trimmed.length > MAX_DESCRIPTION_LENGTH) {
    throw new Error(`Description must be at most ${MAX_DESCRIPTION_LENGTH} characters`);
  }
  return trimmed;
}

export function normalizeClassIcon(icon: string | undefined): string | undefined {
  if (icon === undefined) {
    return undefined;
  }
  const trimmed = icon.trim();
  if (!trimmed) {
    return undefined;
  }
  if (trimmed.length > MAX_ICON_LENGTH) {
    throw new Error(`Icon must be at most ${MAX_ICON_LENGTH} characters`);
  }
  const isFontAwesome = /^(fas|far):[a-z0-9-]+$/i.test(trimmed);
  const isEmoji = !trimmed.includes(":") && /\p{Extended_Pictographic}/u.test(trimmed);
  if (!isFontAwesome && !isEmoji) {
    throw new Error("Icon must be a Font Awesome id or emoji");
  }
  return trimmed;
}

export function deleteClassConfirmationPhrase(name: string): string {
  return `delete ${name}`;
}

export function accountDeleteConfirmationPhrase(email: string | undefined | null): string {
  const trimmed = email?.trim();
  if (trimmed) {
    return `delete ${trimmed}`;
  }
  return "delete my account";
}

void APP_CONFIG;
