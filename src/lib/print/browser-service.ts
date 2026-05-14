// Browser print fallback — uses window.print() via hidden iframe.
// No local agent required. No auto-cutter support.

import type {
  PrintService,
  PrinterCapabilities,
  PrinterInfo,
  TicketPrintInput,
} from "./types";

const VIRTUAL_NAME = "Navegador (sin auto-cutter)";

function printHtmlViaIframe(html: string, title?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("Sin navegador"));
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.setAttribute("aria-hidden", "true");
    document.body.appendChild(iframe);

    const cleanup = () => {
      setTimeout(() => {
        try { document.body.removeChild(iframe); } catch {}
      }, 1000);
    };

    iframe.onload = () => {
      try {
        const win = iframe.contentWindow;
        if (!win) throw new Error("No se pudo abrir ventana de impresión");
        if (title) {
          try { (win.document as any).title = title; } catch {}
        }
        win.focus();
        win.print();
        resolve();
      } catch (e: any) {
        reject(new Error(e?.message ?? "Fallo de impresión por navegador"));
      } finally {
        cleanup();
      }
    };

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      cleanup();
      reject(new Error("No se pudo abrir documento de impresión"));
      return;
    }
    doc.open();
    doc.write(html);
    doc.close();
  });
}

export const browserPrintService: PrintService = {
  id: "browser",

  async isAvailable() {
    return typeof window !== "undefined" && typeof window.print === "function";
  },

  async connect() { /* nothing */ },
  async disconnect() { /* nothing */ },

  async listPrinters(): Promise<PrinterInfo[]> {
    return [{ name: VIRTUAL_NAME }];
  },

  async getCapabilities(_printerName: string): Promise<PrinterCapabilities> {
    return { autoCutter: "none", raw: false };
  },

  async printTicket(_printerName: string, input: TicketPrintInput) {
    await printHtmlViaIframe(input.html, input.title);
  },

  async printTest(_printerName: string, html: string) {
    await printHtmlViaIframe(html, "Test");
  },
};
