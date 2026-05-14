// Single entry point for printing across the app.
// Today: QZ Tray. Tomorrow: swap implementation here without touching callers.

import { qzPrintService } from "./qz-service";
import type { PrintService, TicketPrintInput } from "./types";
import { getActivePrinter } from "./storage";

export type { PrintService, PrinterInfo, PrinterCapabilities, TicketPrintInput } from "./types";
export { getLastPrinter, setLastPrinter, getActivePrinter, setActivePrinter, getMachineId } from "./storage";

let current: PrintService = qzPrintService;

export function getPrintService(): PrintService {
  return current;
}

/** For tests / future CATAPRINT swap. */
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
  await current.printTicket(active.name, input);
}
