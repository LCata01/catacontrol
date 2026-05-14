// Browser print fallback — uses window.print() via hidden iframe.
// No local agent required. No auto-cutter support.

import type {
  PrintService,
  PrinterCapabilities,
  PrinterInfo,
  TicketPrintInput,
} from "./types";

const VIRTUAL_NAME = "Navegador (sin auto-cutter)";

// Thermal 80mm receipt CSS — applied to ALL tickets when the browser
// fallback driver is active. Forces black text, no shadows/gradients/radii,
// and isolates the .receipt block during print.
const THERMAL_CSS = `
@page { size: 80mm auto; margin: 0; }
html, body {
  width: 80mm;
  margin: 0;
  padding: 0;
  background: white;
}
.receipt {
  width: 72mm;
  margin: 0 auto;
  padding: 3mm;
  box-sizing: border-box;
  font-family: monospace;
  font-size: 11px;
  line-height: 1.25;
  color: black;
}
.receipt *,
.receipt *::before,
.receipt *::after {
  color: black !important;
  background: transparent !important;
  box-shadow: none !important;
  text-shadow: none !important;
  border-radius: 0 !important;
  background-image: none !important;
  gap: 0 !important;
}
.receipt img {
  max-width: 40mm;
  max-height: 40mm;
  height: auto;
  display: block;
  margin: 0 auto;
}
.hide-on-screen { display: none; }
@media print {
  body * { visibility: hidden; }
  .receipt, .receipt * { visibility: visible; }
  .receipt {
    position: absolute;
    left: 0;
    top: 0;
  }
}
`;

/**
 * Wrap arbitrary ticket HTML so the .receipt visibility rule applies, and
 * inject the thermal stylesheet last so it overrides the ticket's own CSS.
 */
function applyThermalCss(html: string): string {
  const styleTag = `<style data-cataprint-thermal>${THERMAL_CSS}</style>`;

  // Extract existing <body>...</body> if present, else treat the whole input
  // as body content.
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyInner = bodyMatch ? bodyMatch[1] : html;

  // If author already provided a .receipt wrapper, keep it; otherwise wrap.
  const wrapped = /class\s*=\s*["'][^"']*\breceipt\b/i.test(bodyInner)
    ? bodyInner
    : `<div class="receipt">${bodyInner}</div>`;

  // Preserve the original <head> contents (fonts, ticket CSS) but append
  // the thermal stylesheet so it wins by source order.
  const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  const headInner = headMatch ? headMatch[1] : "";

  return `<!doctype html><html><head><meta charset="utf-8">${headInner}${styleTag}</head><body>${wrapped}</body></html>`;
}

function printHtmlViaIframe(rawHtml: string, title?: string): Promise<void> {
  const html = applyThermalCss(rawHtml);
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
