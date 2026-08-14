/**
 * Dev: Vite (LAN-reachable) + Electron (embedded Instant backend via Electron main).
 * Requires: bun scripts/download-instant-backend.mjs (and per-platform JRE/Postgres/MinIO).
 *
 * Vite binds 0.0.0.0:8088 so phones / projection browsers on the same Wi‑Fi
 * can open the classroom URL (join QR / join-display).
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const WEB_PORT = process.env.ELECTRON_WEB_PORT || "8088";
const INSTANT_PORT = process.env.ELECTRON_INSTANT_PORT || "8888";
const ADMIN_PORT = process.env.ELECTRON_ADMIN_PORT || "8787";

const jarPath = path.join("resources", "instant-backend", "instant-standalone.jar");
const jarPlatformPath = path.join(
  "resources",
  "instant-backend",
  process.platform === "win32" ? "win" : process.platform === "darwin" ? "mac" : "linux",
  "instant-standalone.jar",
);

if (!existsSync(jarPath) && !existsSync(jarPlatformPath)) {
  console.warn(
    `Missing ${jarPath}. Run: bun scripts/download-instant-backend.mjs (Electron will error until artifacts exist).`,
  );
}

await import("./build-electron.mjs");

const bunBin = process.execPath;

const viteEnv = {
  ...process.env,
  VITE_SELF_HOSTED: "true",
  VITE_CLASS_PRESENCE_ENABLED: "true",
  CLASS_PRESENCE_ENABLED: "true",
  VITE_INSTANT_API_URI: `http://127.0.0.1:${INSTANT_PORT}`,
  VITE_ADMIN_URL: `http://127.0.0.1:${ADMIN_PORT}`,
};

const vite = spawn(bunBin, ["x", "vp", "dev", "--host", "0.0.0.0", "--port", WEB_PORT], {
  env: viteEnv,
  stdio: "inherit",
});

async function waitForVite() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${WEB_PORT}`);
      if (res.ok || res.status === 404) return;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Vite did not start on port ${WEB_PORT}`);
}

await waitForVite();

const electron = spawn(bunBin, ["x", "electron", "."], {
  env: {
    ...process.env,
    ELECTRON_RENDERER_URL: `http://127.0.0.1:${WEB_PORT}`,
    ELECTRON_WEB_PORT: WEB_PORT,
    ELECTRON_INSTANT_PORT: INSTANT_PORT,
    ELECTRON_ADMIN_PORT: ADMIN_PORT,
    ELECTRON_BUN_BIN: bunBin,
  },
  stdio: "inherit",
});

const shutdown = () => {
  electron.kill();
  vite.kill();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

electron.on("exit", () => {
  vite.kill();
  process.exit(0);
});
