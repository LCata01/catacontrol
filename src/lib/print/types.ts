// PrintService — abstraction over the local print agent.
// Today implemented by QZ Tray. Future: CATAPRINT local service.
// Business code MUST depend only on this interface, never on QZ directly.

export interface PrinterCapabilities {
  autoCutter: "full" | "partial" | "none";
  raw: boolean; // supports raw ESC/POS
}

export interface PrinterInfo {
  name: string;
}

export interface TicketPrintInput {
  /** HTML document for the ticket (80mm). */
  html: string;
  /** Title (used by some agents/log). */
  title?: string;
  /** Force-disable cutter for this job. Default false. */
  noCut?: boolean;
}

export interface PrintService {
  readonly id: string; // "qz" | "cataprint" | ...
  isAvailable(): Promise<boolean>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  listPrinters(): Promise<PrinterInfo[]>;
  getCapabilities(printerName: string): Promise<PrinterCapabilities>;
  printTicket(printerName: string, input: TicketPrintInput): Promise<void>;
  printTest(printerName: string, html: string): Promise<void>;
}
