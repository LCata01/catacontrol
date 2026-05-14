// QZ Tray integration for ESC/POS thermal printers with hardware autocutter.
// Loads qz-tray.js from CDN on demand, connects to the local QZ Tray daemon
// (must be installed and running on the cashier machine: https://qz.io/),
// and exposes helpers to print raw ESC/POS commands.

declare global {
  interface Window {
    qz?: any;
  }
}

const QZ_CDN = "https://cdn.jsdelivr.net/npm/qz-tray@2.2.4/qz-tray.js";
const PRINTER_KEY = "cata.printer.name";

let loadingPromise: Promise<any> | null = null;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("No se pudo cargar QZ Tray"));
    document.head.appendChild(s);
  });
}

export async function loadQz(): Promise<any> {
  if (typeof window === "undefined") throw new Error("QZ requiere navegador");
  if (window.qz) return window.qz;
  if (!loadingPromise) {
    loadingPromise = (async () => {
      await loadScript(QZ_CDN);
      const qz = window.qz!;
      // Use native Promises
      qz.api.setPromiseType((resolver: any) => new Promise(resolver));
      // Allow unsigned use (prompts the user via QZ Tray dialog)
      try {
        qz.security.setCertificatePromise((resolve: any) => resolve());
        qz.security.setSignaturePromise(() => (resolve: any) => resolve());
      } catch {}
      return qz;
    })();
  }
  return loadingPromise;
}

export async function connectQz(): Promise<any> {
  const qz = await loadQz();
  if (!qz.websocket.isActive()) {
    await qz.websocket.connect();
  }
  return qz;
}

export async function listPrinters(): Promise<string[]> {
  const qz = await connectQz();
  const list = await qz.printers.find();
  return Array.isArray(list) ? list : [list];
}

export function getSavedPrinter(): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(PRINTER_KEY);
}

export function setSavedPrinter(name: string | null) {
  if (typeof localStorage === "undefined") return;
  if (name) localStorage.setItem(PRINTER_KEY, name);
  else localStorage.removeItem(PRINTER_KEY);
}

export async function printRaw(data: Array<string | { type: string; format: string; data: string }>) {
  const qz = await connectQz();
  const printer = getSavedPrinter();
  if (!printer) throw new Error("No hay impresora configurada");
  const cfg = qz.configs.create(printer, { encoding: "CP437" });
  await qz.print(cfg, data);
}

export function isQzAvailable(): boolean {
  return typeof window !== "undefined" && !!getSavedPrinter();
}
