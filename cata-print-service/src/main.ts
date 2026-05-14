import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, shell, dialog } from "electron";
import * as path from "path";
import AutoLaunch from "auto-launch";
import { loadConfig, saveConfig } from "./config";
import { startServer, stopServer, getStatus } from "./server";
import { getLogger, getLogDir } from "./logger";
import { getPrinters, testPrint } from "./printer";

let tray: Tray | null = null;
let settingsWin: BrowserWindow | null = null;

// Single instance lock — prevent multiple copies of the service
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => openSettings());
}

function iconPath(): string {
  // dist/main.js -> dist/assets/tray.png
  return path.join(__dirname, "assets", process.platform === "win32" ? "tray.ico" : "tray.png");
}

function openSettings() {
  if (settingsWin && !settingsWin.isDestroyed()) {
    settingsWin.show();
    settingsWin.focus();
    return;
  }
  settingsWin = new BrowserWindow({
    width: 560,
    height: 640,
    title: "CATA PRINT SERVICE",
    resizable: false,
    minimizable: true,
    maximizable: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  settingsWin.loadFile(path.join(__dirname, "ui", "settings.html"));
  settingsWin.on("closed", () => (settingsWin = null));
}

function buildTray() {
  let img = nativeImage.createFromPath(iconPath());
  if (img.isEmpty()) img = nativeImage.createEmpty();
  tray = new Tray(img);
  tray.setToolTip("CATA PRINT SERVICE");
  const menu = Menu.buildFromTemplate([
    { label: "CATA PRINT SERVICE", enabled: false },
    { type: "separator" },
    { label: "Abrir configuración", click: openSettings },
    { label: "Carpeta de logs", click: () => shell.openPath(getLogDir()) },
    { type: "separator" },
    {
      label: "Salir",
      click: async () => {
        await stopServer();
        app.exit(0);
      },
    },
  ]);
  tray.setContextMenu(menu);
  tray.on("click", openSettings);
}

async function setupAutoLaunch() {
  try {
    const launcher = new AutoLaunch({ name: "CATA PRINT SERVICE", isHidden: true });
    const enabled = await launcher.isEnabled();
    if (!enabled) await launcher.enable();
  } catch (e) {
    getLogger().warn("AutoLaunch falló", { err: String(e) });
  }
}

// IPC for settings UI
ipcMain.handle("config:get", () => loadConfig());
ipcMain.handle("config:save", (_e, patch) => saveConfig(patch));
ipcMain.handle("printers:list", () => getPrinters());
ipcMain.handle("printer:test", async () => {
  try {
    await testPrint(loadConfig());
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? String(e) };
  }
});
ipcMain.handle("status:get", () => getStatus());
ipcMain.handle("apikey:copy", () => loadConfig().apiKey);

app.whenReady().then(async () => {
  // Hide from dock on macOS — this is a background service
  if (process.platform === "darwin" && app.dock) app.dock.hide();
  loadConfig();
  getLogger().info("CATA PRINT SERVICE iniciando…");
  buildTray();
  startServer();
  await setupAutoLaunch();
});

app.on("window-all-closed", (e: Electron.Event) => {
  // Keep service running in background — do not quit when settings window closes
  e.preventDefault();
});

app.on("before-quit", async () => {
  await stopServer();
});

process.on("uncaughtException", (err) => {
  try { getLogger().error("uncaughtException", { err: String(err) }); } catch {}
});
process.on("unhandledRejection", (err) => {
  try { getLogger().error("unhandledRejection", { err: String(err) }); } catch {}
});
