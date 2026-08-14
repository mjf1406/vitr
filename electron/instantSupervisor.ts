import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import crypto from "node:crypto";

import {
  adminServerBinary,
  instantDataDir,
  instantJar,
  javaBinary,
  minioBinary,
  minioDataDir,
  overrideEdnPath,
  postgresBinary,
  postgresDataDir,
  postgresHintPlanLibrary,
  postgresInitdb,
} from "./paths.ts";

export type InstantSupervisor = {
  start: (ports: { instantPort: number; adminPort: number }) => Promise<void>;
  stop: () => Promise<void>;
};

const POSTGRES_PORT = 5433;
const MINIO_PORT = 19000;
const PG_USER = "instant";
const PG_PASSWORD = "pass";
const PG_DB = "instant";

function randomHex(bytes: number): string {
  return crypto.randomBytes(bytes).toString("hex");
}

function ensureOverrideEdn(): void {
  mkdirSync(instantDataDir(), { recursive: true });
  const filePath = overrideEdnPath();
  if (existsSync(filePath)) return;
  writeFileSync(
    filePath,
    `{
  :aead-keyring "${randomHex(32)}"
  :session-secret "${randomHex(32)}"
}
`,
    "utf8",
  );
}

function spawnLogged(
  command: string,
  args: string[],
  options?: { cwd?: string; env?: NodeJS.ProcessEnv },
): ChildProcess {
  const child = spawn(command, args, {
    cwd: options?.cwd,
    env: options?.env ?? process.env,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  child.stdout?.on("data", (chunk: Buffer) => {
    console.log(`[instant] ${chunk.toString().trimEnd()}`);
  });
  child.stderr?.on("data", (chunk: Buffer) => {
    console.error(`[instant] ${chunk.toString().trimEnd()}`);
  });
  return child;
}

function waitForExit(child: ChildProcess): Promise<void> {
  return new Promise((resolve, reject) => {
    child.on("exit", (code) => {
      if (code === 0 || code === null) resolve();
      else reject(new Error(`Process exited with code ${code}`));
    });
    child.on("error", reject);
  });
}

async function waitForPort(port: number, timeoutMs = 60_000): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const open = await new Promise<boolean>((resolve) => {
      const socket = net.connect({ host: "127.0.0.1", port }, () => {
        socket.end();
        resolve(true);
      });
      socket.on("error", () => resolve(false));
    });
    if (open) return;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Timed out waiting for 127.0.0.1:${port}`);
}

function dataDirInitialized(dir: string): boolean {
  try {
    return readdirSync(dir).length > 0;
  } catch {
    return false;
  }
}

export function createInstantSupervisor(): InstantSupervisor {
  const children: ChildProcess[] = [];

  return {
    async start(ports) {
      ensureOverrideEdn();
      mkdirSync(postgresDataDir(), { recursive: true });
      mkdirSync(minioDataDir(), { recursive: true });

      const java = javaBinary();
      const jar = instantJar();
      if (!existsSync(java) || !existsSync(jar)) {
        throw new Error(
          "Embedded Instant backend is missing. Run `bun run electron:download-backend` and retry.",
        );
      }

      const pg = postgresBinary();
      const initdb = postgresInitdb();
      const pgBinDir = path.dirname(pg);
      const pgEnv = {
        ...process.env,
        PATH: `${pgBinDir}${path.delimiter}${process.env.PATH ?? ""}`,
      };
      if (existsSync(pg) && existsSync(initdb)) {
        if (!dataDirInitialized(postgresDataDir())) {
          await waitForExit(
            spawnLogged(
              initdb,
              ["-D", postgresDataDir(), "-U", PG_USER, "--auth=trust", "--no-instructions"],
              { env: pgEnv },
            ),
          );
        }
        const pgArgs = [
          "-D",
          postgresDataDir(),
          "-p",
          String(POSTGRES_PORT),
          "-c",
          "wal_level=logical",
          "-c",
          "max_replication_slots=10",
          "-c",
          "max_wal_senders=10",
        ];
        if (existsSync(postgresHintPlanLibrary())) {
          pgArgs.push("-c", "shared_preload_libraries=pg_hint_plan");
        }
        children.push(spawnLogged(pg, pgArgs, { env: pgEnv }));
        await waitForPort(POSTGRES_PORT);
      }

      const minio = minioBinary();
      if (existsSync(minio)) {
        children.push(
          spawnLogged(minio, ["server", minioDataDir(), "--address", `127.0.0.1:${MINIO_PORT}`]),
        );
        await waitForPort(MINIO_PORT);
      }

      const configDir = path.join(instantDataDir(), "config");
      mkdirSync(configDir, { recursive: true });
      const overrideTarget = path.join(configDir, "override.edn");
      if (!existsSync(overrideTarget)) {
        writeFileSync(overrideTarget, "", "utf8");
      }

      children.push(
        spawnLogged(java, ["-Xmx2g", "-Xms2g", "-jar", jar], {
          cwd: instantDataDir(),
          env: {
            ...process.env,
            JAVA_OPTS: "-Xmx2g -Xms2g",
            WAL_HISTORY_STORAGE: "pg",
            DATABASE_URL: `postgresql://${PG_USER}:${PG_PASSWORD}@127.0.0.1:${POSTGRES_PORT}/${PG_DB}?sslmode=disable`,
            CONNECTION_POOL_SIZE: "10",
            INSTANT_BACKEND_URL: `http://127.0.0.1:${ports.instantPort}`,
            AWS_ACCESS_KEY_ID: "minioadmin",
            AWS_SECRET_ACCESS_KEY: "minioadmin",
            AWS_REGION: "us-east-1",
            S3_ENDPOINT: `http://127.0.0.1:${MINIO_PORT}`,
            S3_PUBLIC_ENDPOINT: `http://127.0.0.1:${MINIO_PORT}`,
            S3_BUCKET: "instant-bucket",
            PORT: String(ports.instantPort),
          },
        }),
      );
      await waitForPort(ports.instantPort, 90_000);

      const adminBin = adminServerBinary();
      const bunBin = process.env.ELECTRON_BUN_BIN;
      const adminEnv: NodeJS.ProcessEnv = {
        ...process.env,
        ADMIN_PORT: String(ports.adminPort),
        INSTANT_API_URI: `http://127.0.0.1:${ports.instantPort}`,
        INSTANT_APP_ID: process.env.INSTANT_APP_ID ?? "",
        INSTANT_APP_ADMIN_TOKEN: process.env.INSTANT_APP_ADMIN_TOKEN ?? "",
        VITE_SELF_HOSTED: "true",
      };
      if (existsSync(adminBin)) {
        children.push(spawnLogged(adminBin, [], { env: adminEnv }));
      } else if (bunBin) {
        children.push(spawnLogged(bunBin, ["server/index.ts"], { env: adminEnv }));
      }
      if (existsSync(adminBin) || bunBin) {
        await waitForPort(ports.adminPort, 30_000);
      }
    },
    async stop() {
      for (const child of children.splice(0).reverse()) {
        child.kill();
      }
    },
  };
}
