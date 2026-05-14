// QZ Tray integration with digital signing for trusted, popup-less printing.
// Loads qz-tray.js from CDN, fetches certificate from server, and signs each
// request server-side with the private key (SHA512withRSA).

import { getQzCertificate, signQzPayload } from "./qz-sign.functions";

declare global {
  interface Window {
    qz?: any;
  }
}

const QZ_CDN = "https://cdn.jsdelivr.net/npm/qz-tray@2.2.4/qz-tray.js";
const PRINTER_KEY = "cata.printer.name";

let loadingPromise: Promise<any> | null = null;
let cachedCert: string | null | undefined = undefined;

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

async function fetchCertificate(): Promise<string | null> {
  if (cachedCert !== undefined) return cachedCert;
  try {
    const res = await getQzCertificate();
    cachedCert = res.certificate ?? null;
  } catch {
    cachedCert = null;
  }
  return cachedCert;
}

export async function loadQz(): Promise<any> {
  if (typeof window === "undefined") throw new Error("QZ requiere navegador");
  if (window.qz) return window.qz;
  if (!loadingPromise) {
    loadingPromise = (async () => {
      await loadScript(QZ_CDN);
      const qz = window.qz!;
      qz.api.setPromiseType((resolver: any) => new Promise(resolver));
      // SHA512 is the QZ Tray 2.1+ default; declare explicitly.
      try { qz.security.setSignatureAlgorithm("SHA512"); } catch {}

      const cert = await fetchCertificate();
      if (cert) {
        qz.security.setCertificatePromise((resolve: any) => resolve(cert));
        qz.security.setSignaturePromise((toSign: string) => {
          return (resolve: any, reject: any) => {
            signQzPayload({ data: { payload: toSign } })
              .then((r: any) => resolve(r.signature))
              .catch((e: any) => reject(e));
          };
        });
      } else {
        // No cert configured — fall back to QZ's authorization popup.
        qz.security.setCertificatePromise((resolve: any) => resolve());
        qz.security.setSignaturePromise(() => (resolve: any) => resolve());
      }
      return qz;
    })();
  }
  return loadingPromise;
}

export async function connectQz(): Promise<any> {
  const qz = await loadQz();
  if (qz.websocket.isActive()) return qz;

  // Try secure connection first (wss://localhost:8181), then fall back to insecure (ws://localhost:8182).
  const attempts: Array<Record<string, any>> = [
    { retries: 2, delay: 1 },
    { usingSecure: false, retries: 1, delay: 1 },
  ];
  let lastErr: any = null;
  for (const opts of attempts) {
    try {
      await qz.websocket.connect(opts);
      return qz;
    } catch (e) {
      lastErr = e;
    }
  }
  console.error("QZ connect failed:", lastErr);
  const msg = typeof lastErr === "string" ? lastErr : (lastErr?.message || "");
  throw new Error(
    `No se pudo conectar a QZ Tray. Verificá que esté abierto y que hayas aceptado el certificado en https://localhost:8181 ${msg ? "(" + msg + ")" : ""}`.trim()
  );
}

export async function isQzConnected(): Promise<boolean> {
  try {
    const qz = await loadQz();
    return qz.websocket.isActive();
  } catch {
    return false;
  }
}

export async function disconnectQz(): Promise<void> {
  if (typeof window === "undefined" || !window.qz) return;
  if (window.qz.websocket.isActive()) {
    try { await window.qz.websocket.disconnect(); } catch {}
  }
}

export function clearQzCache() {
  cachedCert = undefined;
  loadingPromise = null;
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
