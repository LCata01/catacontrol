// QZ Tray implementation of PrintService.
// Temporary compatibility layer — to be replaced by CATAPRINT local service.
// Business code must NEVER import this directly; go through getPrintService().

import qz from "qz-tray";
import type {
  PrintService,
  PrinterCapabilities,
  PrinterInfo,
  TicketPrintInput,
} from "./types";
import { getQzCertificate, signQzRequest } from "./qz-signing.functions";

let signingConfigured = false;
function configureSigning() {
  if (signingConfigured) return;
  signingConfigured = true;

  // SHA512 to match server signer.
  qz.security.setSignatureAlgorithm("SHA512");

  qz.security.setCertificatePromise((resolve: any, reject: any) => {
    getQzCertificate({})
      .then((r: { certificate: string }) => resolve(r.certificate))
      .catch(reject);
  });

  qz.security.setSignaturePromise((toSign: string) => {
    return (resolve: any, reject: any) => {
      signQzRequest({ data: { request: toSign } })
        .then((r: { signature: string }) => resolve(r.signature))
        .catch(reject);
    };
  });
}

// ESC/POS cut commands (appended after HTML jobs)
const ESC_FULL_CUT = "\x1D\x56\x00";
const ESC_PARTIAL_CUT = "\x1D\x56\x01";

let connectPromise: Promise<void> | null = null;

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

async function ensureConnected() {
  configureSigning();
  if (qz.websocket.isActive()) return;
  if (connectPromise) return connectPromise;
  connectPromise = (async () => {
    try {
      await qz.websocket.connect({ retries: 1, delay: 1 });
    } finally {
      connectPromise = null;
    }
  })();
  return connectPromise;
}

export const qzPrintService: PrintService = {
  id: "qz",

  async isAvailable() {
    if (typeof window === "undefined") return false;
    try {
      await qz.websocket.connect({ retries: 0, delay: 0 });
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
      } catch {}
    }
  },

  async listPrinters(): Promise<PrinterInfo[]> {
    await ensureConnected();
    const names: string[] = await qz.printers.find();
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

    const data: any[] = [
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

    await qz.print(config, data);
  },

  async printTest(printerName: string, html: string) {
    return this.printTicket(printerName, { html, title: "Prueba" });
  },
};
