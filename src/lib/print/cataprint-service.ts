// CATAPRINT driver — talks HTTP to the local cataprint-agent service.
// No browser plugin / no Java required. Replaces QZ Tray.

import type {
  PrintService,
  PrinterCapabilities,
  PrinterInfo,
  TicketPrintInput,
} from "./types";

const DEFAULT_BASE = "http://127.0.0.1:9100";
const DEFAULT_WS_BASE = "ws://127.0.0.1:9100/ws";
type LnaRequestInit = RequestInit & { targetAddressSpace?: "local" | "loopback" };

function getBase(): string {
  if (typeof window === "undefined") return DEFAULT_BASE;
  return localStorage.getItem("cata_cataprint_url") || DEFAULT_BASE;
}

function getWsBase(): string {
  if (typeof window === "undefined") return DEFAULT_WS_BASE;
  const httpBase = getBase();
  return localStorage.getItem("cata_cataprint_ws_url") || httpBase.replace(/^http:/, "ws:").replace(/^https:/, "wss:") + "/ws";
}

async function fetchLocal(path: string, init?: RequestInit): Promise<Response> {
  const url = `${getBase()}${path}`;
  const baseInit: RequestInit = {
    ...init,
    mode: "cors",
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  };
  try {
    return await fetch(url, { ...baseInit, targetAddressSpace: "loopback" } as LnaRequestInit);
  } catch {
    return fetch(url, baseInit);
  }
}

let ws: WebSocket | null = null;
let wsReady: Promise<WebSocket> | null = null;
let wsSeq = 0;
const wsPending = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void; timer: number }>();

function wsConnect(): Promise<WebSocket> {
  if (typeof window === "undefined") return Promise.reject(new Error("CATAPRINT requiere navegador"));
  if (ws?.readyState === WebSocket.OPEN) return Promise.resolve(ws);
  if (wsReady) return wsReady;
  wsReady = new Promise((resolve, reject) => {
    const socket = new WebSocket(getWsBase());
    const timeout = window.setTimeout(() => {
      socket.close();
      reject(new Error("CATAPRINT no responde por WebSocket"));
    }, 1500);
    socket.onopen = () => { window.clearTimeout(timeout); ws = socket; resolve(socket); };
    socket.onerror = () => reject(new Error("CATAPRINT no está corriendo en esta PC"));
    socket.onclose = () => { if (ws === socket) ws = null; wsReady = null; };
    socket.onmessage = (ev) => {
      let msg: any;
      try { msg = JSON.parse(String(ev.data)); } catch { return; }
      const pending = wsPending.get(msg.id);
      if (!pending) return;
      window.clearTimeout(pending.timer);
      wsPending.delete(msg.id);
      if (msg.ok) pending.resolve(msg.result);
      else pending.reject(new Error(msg.error || "Error CATAPRINT"));
    };
  }).finally(() => { wsReady = null; });
  return wsReady;
}

async function wsReq<T = any>(action: string, payload?: any): Promise<T> {
  const socket = await wsConnect();
  const id = ++wsSeq;
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      wsPending.delete(id);
      reject(new Error("CATAPRINT no respondió a tiempo"));
    }, 10000);
    wsPending.set(id, { resolve, reject, timer });
    socket.send(JSON.stringify({ id, action, payload }));
  });
}

async function req<T = any>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetchLocal(path, init);
  const text = await res.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!res.ok) {
    const msg = body?.error ?? `CATAPRINT ${res.status}`;
    throw new Error(msg);
  }
  return body as T;
}

async function reqWithWsFallback<T = any>(path: string, action: string, payload?: any, init?: RequestInit): Promise<T> {
  try {
    return await req<T>(path, init);
  } catch (error: any) {
    const blocked = String(error?.message ?? error).includes("Failed to fetch") || String(error?.message ?? error).includes("NetworkError");
    if (!blocked) throw error;
    return wsReq<T>(action, payload);
  }
}

export const cataprintService: PrintService = {
  id: "cataprint",

  async isAvailable() {
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 1500);
      const res = await fetchLocal("/health", { signal: ctl.signal });
      clearTimeout(t);
      return res.ok;
    } catch {
      try {
        await wsReq("health");
        return true;
      } catch {
        return false;
      }
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
    const { printers } = await reqWithWsFallback<{ printers: PrinterInfo[] }>("/printers", "printers");
    return printers ?? [];
  },

  async getCapabilities(printerName: string): Promise<PrinterCapabilities> {
    return reqWithWsFallback<PrinterCapabilities>(
      `/printers/${encodeURIComponent(printerName)}/capabilities`,
      "capabilities",
      { name: printerName },
    );
  },

  async printTicket(printerName: string, input: TicketPrintInput) {
    const payload = {
      printer: printerName,
      html: input.html,
      title: input.title,
      cut: !input.noCut,
    };
    await reqWithWsFallback("/print", "print", payload, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async printTest(printerName: string, html: string) {
    const payload = { printer: printerName, html, title: "Test" };
    await reqWithWsFallback("/print", "print", payload, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
