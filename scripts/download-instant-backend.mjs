/**
 * Fetch Instant embed artifacts for the current platform.
 * Validate Windows x64 first; other platforms share the same layout.
 *
 *   bun scripts/download-instant-backend.mjs
 *
 * Layout (resources/instant-backend/<win|mac|linux>/):
 *   jre/bin/java(.exe)
 *   postgres/bin/postgres(.exe)
 *   minio/minio(.exe)
 *   instant-standalone.jar
 *
 * pg_hint_plan has no upstream Windows/macOS prebuild; Instant starts without it.
 */
import { createWriteStream } from "node:fs";
import { mkdir, writeFile, copyFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

const platform =
  process.env.ELECTRON_PLATFORM ??
  (process.platform === "win32" ? "win" : process.platform === "darwin" ? "mac" : "linux");
const arch = process.env.ELECTRON_ARCH ?? (process.arch === "arm64" ? "arm64" : "x64");

const outRoot = path.join("resources", "instant-backend");
const platformDir = path.join(outRoot, platform);

async function run(command, args, { optional = false } = {}) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", shell: true });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else if (optional) {
        console.warn(`${command} exited ${code} (optional, continuing)`);
        resolve();
      } else reject(new Error(`${command} exit ${code}`));
    });
    child.on("error", (error) => {
      if (optional) {
        console.warn(`${command} failed (optional): ${error.message}`);
        resolve();
      } else reject(error);
    });
  });
}

async function download(url, dest) {
  console.log(`Downloading ${url}`);
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok || !res.body) {
    throw new Error(`GET ${url} -> ${res.status}`);
  }
  await mkdir(path.dirname(dest), { recursive: true });
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
}

async function extractInstantJar() {
  await mkdir(platformDir, { recursive: true });
  const jarDest = path.join(platformDir, "instant-standalone.jar");
  console.log("Pulling Instant server image (optional if Docker is missing)…");
  try {
    await run("docker", ["pull", "ghcr.io/instantdb/server:latest"]);
    const container = "vitr-instant-extract";
    await run("docker", ["rm", "-f", container], { optional: true });
    await run("docker", ["create", "--name", container, "ghcr.io/instantdb/server:latest"]);
    try {
      await run("docker", ["cp", `${container}:/app/target/instant-standalone.jar`, jarDest]);
    } catch {
      await run("docker", ["cp", `${container}:/instant-standalone.jar`, jarDest]);
    }
    await run("docker", ["rm", container], { optional: true });
    await copyFile(jarDest, path.join(outRoot, "instant-standalone.jar"));
  } catch (error) {
    console.warn(
      `Could not extract Instant jar via Docker: ${error instanceof Error ? error.message : error}`,
    );
  }
}

async function fetchWindowsX64() {
  const jreZip = path.join(platformDir, "jre.zip");
  const pgTar = path.join(platformDir, "postgres.tgz");
  const minioDest = path.join(platformDir, "minio", "minio.exe");

  await download(
    "https://api.adoptium.net/v3/binary/latest/21/ga/windows/x64/jre/hotspot/normal/eclipse?project=jdk",
    jreZip,
  );
  await mkdir(path.join(platformDir, "jre"), { recursive: true });
  await run("tar", ["-xf", jreZip, "-C", path.join(platformDir, "jre"), "--strip-components", "1"]);

  await download(
    "https://github.com/theseus-rs/postgresql-binaries/releases/download/17.5.0/postgresql-17.5.0-x86_64-pc-windows-msvc.tar.gz",
    pgTar,
  );
  await mkdir(path.join(platformDir, "postgres"), { recursive: true });
  await run("tar", [
    "-xf",
    pgTar,
    "-C",
    path.join(platformDir, "postgres"),
    "--strip-components",
    "1",
  ]);

  await download("https://dl.min.io/server/minio/release/windows-amd64/minio.exe", minioDest);
}

await mkdir(platformDir, { recursive: true });
await extractInstantJar();

if (platform === "win" && arch === "x64") {
  try {
    await fetchWindowsX64();
    console.log("Windows x64 JRE, Postgres 17, and MinIO fetched.");
  } catch (error) {
    console.warn(
      `Windows artifact download incomplete: ${error instanceof Error ? error.message : error}`,
    );
    console.warn(
      "Place jre/, postgres/, and minio/ under resources/instant-backend/win/ manually.",
    );
  }
} else {
  console.log(
    `Skipping binary fetch for ${platform}-${arch}. Validate Windows x64 first, then add this platform's JRE/Postgres/MinIO under ${platformDir}.`,
  );
}

await writeFile(
  path.join(outRoot, "README.md"),
  `# Instant embed artifacts

Per-platform folder: \`win/\`, \`mac/\`, \`linux/\`.

- jre/ (Temurin 21 JRE or jlink image)
- postgres/bin/postgres
- pg_hint_plan on Postgres's library path (Linux image only; Windows/macOS have no upstream prebuild)
- minio
- instant-standalone.jar (extracted from ghcr.io/instantdb/server:latest)

Windows x64 is fetched by this script. Other platforms must be added after Windows validation.
Expected installer size is 400–500 MB; idle RAM is about 2–3 GB.
`,
  "utf8",
);

console.log(`Wrote Instant backend under ${outRoot}`);
