import {
  app,
  BrowserWindow,
  ipcMain,
  shell,
  type BrowserWindow as BrowserWindowType,
} from "electron";
import path from "node:path";

import { createAutoUpdater } from "./autoUpdate.ts";
import { createInstantSupervisor } from "./instantSupervisor.ts";
import { detectLanIpv4 } from "./lan.ts";
import { findFreePort } from "./ports.ts";
import { isDev, rendererDistDir } from "./paths.ts";
import { listenStaticServer, type StaticEnv } from "./staticServer.ts";
import { CLASSROOM_IPC, type ClassroomSession } from "./types.ts";

const DEFAULT_WEB_PORT = 8088;
const DEFAULT_INSTANT_PORT = 8888;
const DEFAULT_ADMIN_PORT = 8787;

let mainWindow: BrowserWindowType | null = null;
let session: ClassroomSession = {
  status: "starting",
  lanBaseUrl: null,
  loopbackBaseUrl: `http://127.0.0.1:${DEFAULT_WEB_PORT}`,
  instantApiUri: `http://127.0.0.1:${DEFAULT_INSTANT_PORT}`,
  adminUrl: `http://127.0.0.1:${DEFAULT_ADMIN_PORT}`,
  webPort: DEFAULT_WEB_PORT,
  instantPort: DEFAULT_INSTANT_PORT,
  adminPort: DEFAULT_ADMIN_PORT,
  lanIp: null,
  errorMessage: null,
  trustedLanWarning: true,
};

let staticClose: (() => Promise<void>) | null = null;
let supervisor: ReturnType<typeof createInstantSupervisor> | null = null;
let currentEnv: StaticEnv = {
  VITE_INSTANT_APP_ID: process.env.INSTANT_APP_ID ?? "",
  VITE_INSTANT_API_URI: session.instantApiUri,
  VITE_ADMIN_URL: session.adminUrl,
  VITE_CLASS_PRESENCE_ENABLED: "true",
  VITE_SELF_HOSTED: "true",
};

function broadcastSession(): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(CLASSROOM_IPC.onSession, session);
  }
}

function setSession(patch: Partial<ClassroomSession>): void {
  session = { ...session, ...patch };
  broadcastSession();
}

function buildEnv(
  lanIp: string | null,
  ports: { webPort: number; instantPort: number; adminPort: number },
): StaticEnv {
  const host = lanIp ?? "127.0.0.1";
  return {
    VITE_INSTANT_APP_ID: process.env.INSTANT_APP_ID ?? "",
    VITE_INSTANT_API_URI: `http://${host}:${ports.instantPort}`,
    VITE_ADMIN_URL: `http://${host}:${ports.adminPort}`,
    VITE_CLASS_PRESENCE_ENABLED: "true",
    VITE_SELF_HOSTED: "true",
  };
}

function splashPath(): string {
  return path.join(import.meta.dirname, "splash.html");
}

async function createWindow(): Promise<void> {
  if (mainWindow && !mainWindow.isDestroyed()) {
    return;
  }

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 900,
    minHeight: 600,
    show: false,
    webPreferences: {
      preload: path.join(import.meta.dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.once("ready-to-show", () => mainWindow?.show());
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  await mainWindow.loadFile(splashPath());
}

async function navigateMainWindow(loadUrl: string): Promise<void> {
  if (!mainWindow || mainWindow.isDestroyed()) {
    await createWindow();
  }
  if (!mainWindow || mainWindow.isDestroyed()) {
    throw new Error("Main window unavailable");
  }
  await mainWindow.loadURL(loadUrl);
}

async function startClassroom(): Promise<void> {
  try {
    setSession({ status: "starting", errorMessage: null });

    const webPort = isDev()
      ? Number(process.env.ELECTRON_WEB_PORT || DEFAULT_WEB_PORT)
      : await findFreePort(DEFAULT_WEB_PORT);
    const instantPort = isDev()
      ? Number(process.env.ELECTRON_INSTANT_PORT || DEFAULT_INSTANT_PORT)
      : await findFreePort(DEFAULT_INSTANT_PORT);
    const adminPort = isDev()
      ? Number(process.env.ELECTRON_ADMIN_PORT || DEFAULT_ADMIN_PORT)
      : await findFreePort(DEFAULT_ADMIN_PORT);
    const lanIp = detectLanIpv4();

    currentEnv = buildEnv(lanIp, { webPort, instantPort, adminPort });
    const loopbackBaseUrl = `http://127.0.0.1:${webPort}`;
    const lanBaseUrl = lanIp ? `http://${lanIp}:${webPort}` : null;

    setSession({
      webPort,
      instantPort,
      adminPort,
      lanIp,
      loopbackBaseUrl,
      lanBaseUrl,
      instantApiUri: `http://127.0.0.1:${instantPort}`,
      adminUrl: `http://127.0.0.1:${adminPort}`,
    });

    supervisor = createInstantSupervisor();
    await supervisor.start({ instantPort, adminPort });

    if (isDev()) {
      const viteUrl = process.env.ELECTRON_RENDERER_URL ?? `http://127.0.0.1:${webPort}`;
      await navigateMainWindow(viteUrl);
    } else {
      const staticServer = await listenStaticServer({
        rootDir: rendererDistDir(),
        port: webPort,
        getEnv: () => currentEnv,
      });
      staticClose = () => staticServer.close();
      await navigateMainWindow(loopbackBaseUrl);
    }

    setInterval(() => {
      const nextIp = detectLanIpv4();
      if (nextIp !== session.lanIp) {
        currentEnv = buildEnv(nextIp, {
          webPort: session.webPort,
          instantPort: session.instantPort,
          adminPort: session.adminPort,
        });
        setSession({
          lanIp: nextIp,
          lanBaseUrl: nextIp ? `http://${nextIp}:${session.webPort}` : null,
        });
      }
    }, 15_000);

    setSession({ status: "running" });
    appAutoUpdate.start();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[classroom] failed to start", error);
    setSession({ status: "error", errorMessage: message });
    if (!mainWindow || mainWindow.isDestroyed()) {
      await createWindow().catch((createError) => {
        console.error("[classroom] failed to show error splash", createError);
      });
    }
  }
}

async function shutdown(): Promise<void> {
  setSession({ status: "stopped" });
  if (staticClose) {
    await staticClose().catch(() => undefined);
    staticClose = null;
  }
  if (supervisor) {
    await supervisor.stop().catch(() => undefined);
    supervisor = null;
  }
}

const appAutoUpdate = createAutoUpdater({ shutdown });

app.whenReady().then(() => {
  ipcMain.handle(CLASSROOM_IPC.getSession, () => session);

  void createWindow()
    .then(() => startClassroom())
    .catch((error) => {
      console.error("[classroom] startup failed before splash", error);
    });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow().then(async () => {
        if (session.status === "running") {
          await navigateMainWindow(session.loopbackBaseUrl);
        }
      });
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", (event) => {
  if (appAutoUpdate.isQuittingForUpdate()) {
    return;
  }
  if (supervisor || staticClose) {
    event.preventDefault();
    void shutdown().finally(() => {
      if (appAutoUpdate.isUpdateReady()) {
        appAutoUpdate.quitAndInstall();
        return;
      }
      app.exit(0);
    });
  }
});
