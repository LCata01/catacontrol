// Single entry point for printing across the app.
// Driver selection: CATAPRINT (preferred) → QZ Tray (legacy compat).
// Override via localStorage.cata_print_driver = "cataprint" | "qz" | "auto" (default).

import { qzPrintService } from "./qz-service";
import { cataprintService } from "./cataprint-service";
import { browserPrintService } from "./browser-service";
import type { PrintService, TicketPrintInput } from "./types";
import { getActivePrinter } from "./storage";

export type { PrintService, PrinterInfo, PrinterCapabilities, TicketPrintInput } from "./types";
export { getLastPrinter, setLastPrinter, getActivePrinter, setActivePrinter, getMachineId } from "./storage";

const DRIVER_KEY = "cata_print_driver";

type DriverId = "cataprint" | "qz" | "browser" | "auto";

function readDriverPref(): DriverId {
  if (typeof window === "undefined") return "auto";
  const v = localStorage.getItem(DRIVER_KEY);
  if (v === "cataprint" || v === "qz" || v === "browser" || v === "auto") return v;
  return "auto";
}

export function setPrintDriver(d: DriverId) {
  if (typeof window === "undefined") return;
  localStorage.setItem(DRIVER_KEY, d);
  current = null; // force re-resolve next call
}

export function getPrintDriverPref(): DriverId {
  return readDriverPref();
}

let current: PrintService | null = null;
let resolving: Promise<PrintService> | null = null;

async function resolveService(): Promise<PrintService> {
  const pref = readDriverPref();
  if (pref === "qz") return qzPrintService;
  if (pref === "cataprint") return cataprintService;
  // auto: prefer CATAPRINT, fall back to QZ
  const cataOk = await cataprintService.isAvailable();
  return cataOk ? cataprintService : qzPrintService;
}

/** Sync getter — returns last resolved service or QZ as safe default. */
export function getPrintService(): PrintService {
  if (current) return current;
  // Kick off background resolution but return a proxy that awaits.
  if (!resolving) {
    resolving = resolveService().then((s) => {
      current = s;
      resolving = null;
      return s;
    });
  }
  return makeAsyncProxy();
}

function makeAsyncProxy(): PrintService {
  // Lightweight proxy: each method awaits resolution, then delegates.
  const lazy = async () => current ?? (await resolving!);
  return {
    get id() { return current?.id ?? "auto"; },
    isAvailable: async () => (await lazy()).isAvailable(),
    connect: async () => (await lazy()).connect(),
    disconnect: async () => (await lazy()).disconnect(),
    listPrinters: async () => (await lazy()).listPrinters(),
    getCapabilities: async (n) => (await lazy()).getCapabilities(n),
    printTicket: async (n, i) => (await lazy()).printTicket(n, i),
    printTest: async (n, h) => (await lazy()).printTest(n, h),
  } as PrintService;
}

/** For tests / manual override. */
export function _setPrintService(svc: PrintService) {
  current = svc;
}

/**
 * Print a ticket using the printer bound to the current session.
 * Throws if no active printer is set — caller must run PrinterSetup first.
 */
export async function printToActivePrinter(input: TicketPrintInput) {
  const active = getActivePrinter();
  if (!active) {
    throw new Error("No hay impresora seleccionada para esta sesión");
  }
  if (active.bypass) {
    // Bypass mode: tickets are intentionally not printed.
    return;
  }
  await getPrintService().printTicket(active.name, input);
}
