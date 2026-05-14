// CATAPRINT driver — talks HTTP to the local cataprint-agent service.
// No browser plugin / no Java required. Replaces QZ Tray.

import type {
  PrintService,
  PrinterCapabilities,
  PrinterInfo,
  TicketPrintInput,
} from "./types";

const DEFAULT_BASE = "http://127.0.0.1:9100";

function getBase(): string {
  if (typeof window === "undefined") return DEFAULT_BASE;
  return localStorage.getItem("cata_cataprint_url") || DEFAULT_BASE;
}

async function req<T = any>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${getBase()}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const text = await res.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!res.ok) {
    const msg = body?.error ?? `CATAPRINT ${res.status}`;
    throw new Error(msg);
  }
  return body as T;
}

export const cataprintService: PrintService = {
  id: "cataprint",

  async isAvailable() {
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 1500);
      const res = await fetch(`${getBase()}/health`, { signal: ctl.signal });
      clearTimeout(t);
      return res.ok;
    } catch {
      return false;
    }
  },

  async connect() {
    const ok = await this.isAvailable();
    if (!ok) {
      throw new Error(
        "CATAPRINT no está corriendo en esta PC. Iniciá el servicio CATAPRINT o instalalo desde el panel de soporte.",
      );
    }
  },

  async disconnect() { /* nothing */ },

  async listPrinters(): Promise<PrinterInfo[]> {
    const { printers } = await req<{ printers: PrinterInfo[] }>("/printers");
    return printers ?? [];
  },

  async getCapabilities(printerName: string): Promise<PrinterCapabilities> {
    return req<PrinterCapabilities>(
      `/printers/${encodeURIComponent(printerName)}/capabilities`,
    );
  },

  async printTicket(printerName: string, input: TicketPrintInput) {
    await req("/print", {
      method: "POST",
      body: JSON.stringify({
        printer: printerName,
        html: input.html,
        title: input.title,
        cut: !input.noCut,
      }),
    });
  },

  async printTest(printerName: string, html: string) {
    await req("/print", {
      method: "POST",
      body: JSON.stringify({ printer: printerName, html, title: "Test" }),
    });
  },
};
