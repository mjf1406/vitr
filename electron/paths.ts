import { app } from "electron";
import path from "node:path";
import { existsSync } from "node:fs";

export function isDev(): boolean {
  return !app.isPackaged;
}

export function userDataRoot(): string {
  return path.join(app.getPath("userData"), "classroom");
}

export function instantDataDir(): string {
  return path.join(userDataRoot(), "instant-data");
}

export function postgresDataDir(): string {
  return path.join(instantDataDir(), "postgres");
}

export function minioDataDir(): string {
  return path.join(instantDataDir(), "minio");
}

export function overrideEdnPath(): string {
  return path.join(instantDataDir(), "override.edn");
}

function platformDir(): string {
  return process.platform === "win32" ? "win" : process.platform === "darwin" ? "mac" : "linux";
}

function resourceRoot(): string {
  const root = app.isPackaged
    ? path.join(process.resourcesPath, "instant-backend")
    : path.join(app.getAppPath(), "resources", "instant-backend");
  const nested = path.join(root, platformDir());
  if (existsSync(nested)) {
    return nested;
  }
  return root;
}

export function javaBinary(): string {
  const name = process.platform === "win32" ? "java.exe" : "java";
  return path.join(resourceRoot(), "jre", "bin", name);
}

export function instantJar(): string {
  return path.join(resourceRoot(), "instant-standalone.jar");
}

export function postgresBinary(): string {
  const name = process.platform === "win32" ? "postgres.exe" : "postgres";
  return path.join(resourceRoot(), "postgres", "bin", name);
}

export function postgresInitdb(): string {
  const name = process.platform === "win32" ? "initdb.exe" : "initdb";
  return path.join(resourceRoot(), "postgres", "bin", name);
}

export function postgresHintPlanLibrary(): string {
  const name =
    process.platform === "win32"
      ? "pg_hint_plan.dll"
      : process.platform === "darwin"
        ? "pg_hint_plan.dylib"
        : "pg_hint_plan.so";
  return path.join(resourceRoot(), "postgres", "lib", name);
}

export function minioBinary(): string {
  const name = process.platform === "win32" ? "minio.exe" : "minio";
  return path.join(resourceRoot(), "minio", name);
}

export function adminServerBinary(): string {
  const name = process.platform === "win32" ? "admin-server.exe" : "admin-server";
  return path.join(resourceRoot(), name);
}

export function rendererDistDir(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "renderer");
  }
  return path.join(app.getAppPath(), "dist");
}
