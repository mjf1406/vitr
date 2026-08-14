/**
 * Full Electron package: Instant backend artifacts + self-host renderer + main + electron-builder.
 *
 * Flags:
 *   --dir       unpackaged dir output only
 *   --publish   publish to GitHub Releases (needs GH_TOKEN)
 *
 * Env (CI matrix):
 *   ELECTRON_PLATFORM=win|mac|linux
 *   ELECTRON_ARCH=x64|arm64
 */
import { $ } from "bun";

const dirOnly = process.argv.includes("--dir");
const publish = process.argv.includes("--publish");

const platform =
  process.env.ELECTRON_PLATFORM ??
  (process.platform === "win32" ? "win" : process.platform === "darwin" ? "mac" : "linux");
const arch = process.env.ELECTRON_ARCH ?? (process.arch === "arm64" ? "arm64" : "x64");

await $`bun scripts/download-instant-backend.mjs`;

const adminOut =
  platform === "win"
    ? `resources/instant-backend/${platform}/admin-server.exe`
    : `resources/instant-backend/${platform}/admin-server`;
await $`bun build --compile server/index.ts --outfile ${adminOut}`;

process.env.VITE_SELF_HOSTED = "true";
process.env.VITE_CLASS_PRESENCE_ENABLED = "true";
process.env.CLASS_PRESENCE_ENABLED = "true";
process.env.VITE_INSTANT_API_URI = "http://127.0.0.1:8888";
process.env.VITE_ADMIN_URL = "http://127.0.0.1:8787";
process.env.DISABLE_REACT_COMPILER = "true";

await $`bunx vp build`;
await $`bun scripts/build-electron.mjs`;
await $`bun scripts/prepare-electron-icons.mjs`;

const builderPlatform =
  platform === "win" || platform === "win32"
    ? "win"
    : platform === "mac" || platform === "darwin"
      ? "mac"
      : "linux";
const builderArch = arch === "arm64" ? "arm64" : "x64";

const builderArgs = [
  "electron-builder",
  "--config",
  "electron-builder.config.mjs",
  `--${builderPlatform}`,
  `--${builderArch}`,
];
if (dirOnly) builderArgs.push("--dir");
if (publish) builderArgs.push("--publish", "always");
else builderArgs.push("--publish", "never");

await $`bunx ${builderArgs}`;
