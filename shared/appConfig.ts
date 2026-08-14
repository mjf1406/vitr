/**
 * TEMPLATE: Single brand config — change these when cloning (`bun run post-clone`).
 * Neutral slug/tenant id are `vitr`; sample URLs below still use ClassClarus placeholders
 * until post-clone retargets them. Brand images: `public/vitr/` (`logo-big.webp`, `logo-small.webp`).
 * Template favicon: `public/vitr/logo-small.webp`.
 * `name` is never translated — i18n uses it via defaultVariables.appName.
 */
export const APP_CONFIG = {
  name: "vitr",
  /** Storage keys (`${slug}-…` via src/lib/storageKeys.ts) and package-name check. */
  slug: "vitr",
  /** Appended after name in the document title (`Name | suffix`). */
  titleSuffix: "App",
  /** Canonical app origin (printed join URLs, production deep links). */
  appUrl: "https://app.classclarus.com",
  marketingUrl: "https://www.classclarus.com",
  privacyUrl: "https://www.classclarus.com/privacy-policy",
  termsUrl: "https://www.classclarus.com/terms-and-conditions",
  cookieUrl: "https://www.classclarus.com/cookie-policy",
  changeLog: "https://change-log.pages.dev/classclarus",
  roadMap: "https://change-log.pages.dev/classclarus/board",
  github: "https://github.com/mjf1406/vitr",
  /** Electron / desktop release landing page. Billing Free downloads use desktopDownloads.ts. */
  downloadUrl: "https://github.com/mjf1406/vitr/releases/latest",
  /** Self-hosting docs (billing Free card). Change when cloning. */
  selfHostUrl: "https://github.com/mjf1406/vitr/blob/master/docs/SELF_HOSTING.md",
  /** Tip / gift links (billing page; replace placeholders). */
  kofiUrl: "https://ko-fi.com/YOUR_PAGE",
  patreonUrl: "https://www.patreon.com/YOUR_PAGE",
  /** Browser chrome — hex (meta theme-color is unreliable with oklch). */
  themeColors: {
    light: "#ffffff",
    /** Match `.dark --background` feel (oklch 0.145 ≈ #252525). */
    dark: "#252525",
  },
  /** Keep aligned with page background. */
  backgroundColors: {
    light: "#ffffff",
    dark: "#252525",
  },
  /**
   * App-managed card-less trial (not Polar-native).
   * `days` is the grant length; warn/force control the upgrade banner.
   */
  trial: {
    days: 90,
    warnWithinDays: 14,
    forceWithinDays: 3,
  },
  /**
   * Upload size limits and per-user storage quota.
   */
  uploads: {
    quotaBytes: 100 * 1024 * 1024,
    maxSizeBytes: {
      images: 2 * 1024 * 1024,
      documents: 500 * 1024,
      audio: 5 * 1024 * 1024,
    },
  },
} as const;
