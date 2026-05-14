// QZ Tray implementation of PrintService.
// Temporary compatibility layer — to be replaced by CATAPRINT local service.
// Business code must NEVER import this directly; go through getPrintService().

import qz from "qz-tray";
import type { PrintService, PrinterCapabilities, PrinterInfo, TicketPrintInput } from "./types";

type QzPrintData = { type: string; format: string; flavor: string; data: string };

let signingConfigured = false;
function configureSigning() {
  if (signingConfigured) return;
  signingConfigured = true;

  // Use QZ Tray's built-in demo certificate. QZ Tray will show
  // "QZ Industries, LLC (QZ Tray Demo Cert)" and allow the user to
  // remember the decision permanently.
  qz.security.setCertificatePromise(function (resolve: (v: unknown) => void) {
    resolve((qz.security as { certificates: { demo: string } }).certificates.demo);
  });

  qz.security.setSignaturePromise(function () {
    return function (resolve: () => void) {
      resolve();
    };
  });
}

// ESC/POS cut commands (appended after HTML jobs)
const ESC_FULL_CUT = "\x1D\x56\x00";
const ESC_PARTIAL_CUT = "\x1D\x56\x01";

let connectPromise: Promise<void> | null = null;
const CONNECT_OPTIONS = { retries: 2, delay: 1 };

// Heuristic: many common cutter-capable printer keywords. We don't have a
// reliable cross-driver capability flag through the OS print spooler, so we
// match common families. Override later via a server-side capability table.
const CUTTER_HINTS_FULL = [
  /epson.*(tm|t-?20|t-?88|t-?70|t-?82|m30)/i,
  /xprinter/i,
  /xp-?80/i,
  /xp-?58/i,
  /3nstar/i,
  /bixolon/i,
  /star.*(tsp|mc-?print)/i,
  /citizen.*(ct-?s|cbm)/i,
  /sewoo/i,
  /80mm/i,
  /58mm/i,
  /pos-?80/i,
  /thermal/i,
  /esc.?pos/i,
  /receipt/i,
];

function detectCutter(name: string): "full" | "partial" | "none" {
  if (/microsoft print to pdf|onenote|fax|xps/i.test(name)) return "none";
  if (CUTTER_HINTS_FULL.some((re) => re.test(name))) return "full";
  return "none";
}

function isReconnectableQzError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /sendData is not a function|connection closed|not been established|already exists|still closing|current connection attempt/i.test(
    message,
  );
}

async function settle(ms = 250) {
  await new Promise((resolve) => globalThis.setTimeout(resolve, ms));
}

async function resetConnection() {
  connectPromise = null;
  if (!qz.websocket.isActive()) return;
  try {
    await qz.websocket.disconnect();
  } catch {
    // QZ may already be closing after standby; give the browser a moment.
  }
  await settle();
}

async function verifyConnection() {
  if (!qz.websocket.isActive()) return false;
  try {
    await qz.api.getVersion();
    return true;
  } catch (error) {
    if (isReconnectableQzError(error)) return false;
    throw error;
  }
}

async function ensureConnected() {
  configureSigning();
  if (await verifyConnection()) return;
  await resetConnection();
  if (connectPromise) return connectPromise;
  connectPromise = (async () => {
    try {
      await qz.websocket.connect(CONNECT_OPTIONS);
    } finally {
      connectPromise = null;
    }
  })();
  return connectPromise;
}

async function withReconnect<T>(operation: () => Promise<T>): Promise<T> {
  await ensureConnected();
  try {
    return await operation();
  } catch (error) {
    if (!isReconnectableQzError(error)) throw error;
    await resetConnection();
    await ensureConnected();
    return operation();
  }
}

export const qzPrintService: PrintService = {
  id: "qz",

  async isAvailable() {
    if (typeof window === "undefined") return false;
    try {
      await ensureConnected();
      return true;
    } catch {
      return false;
    }
  },

  async connect() {
    await ensureConnected();
  },

  async disconnect() {
    if (qz.websocket.isActive()) {
      try {
        await qz.websocket.disconnect();
      } catch {
        // Already disconnected.
      }
    }
  },

  async listPrinters(): Promise<PrinterInfo[]> {
    const names: string[] = await withReconnect(() => qz.printers.find());
    return names.map((name) => ({ name }));
  },

  async getCapabilities(name: string): Promise<PrinterCapabilities> {
    return { autoCutter: detectCutter(name), raw: true };
  },

  async printTicket(printerName: string, input: TicketPrintInput) {
    await ensureConnected();
    const caps = await this.getCapabilities(printerName);
    const config = qz.configs.create(printerName, {
      size: { width: 80, height: null },
      units: "mm",
      margins: 0,
    });

    const data: QzPrintData[] = [
      { type: "pixel", format: "html", flavor: "plain", data: input.html },
    ];

    // Append cutter as raw ESC/POS to the same job (most drivers honor mixed).
    if (!input.noCut && caps.autoCutter !== "none") {
      data.push({
        type: "raw",
        format: "command",
        flavor: "plain",
        data: caps.autoCutter === "full" ? ESC_FULL_CUT : ESC_PARTIAL_CUT,
      });
    }

    await withReconnect(() => qz.print(config, data));
  },

  async printTest(printerName: string, html: string) {
    return this.printTicket(printerName, { html, title: "Prueba" });
  },
};
