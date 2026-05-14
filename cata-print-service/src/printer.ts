import { BrowserWindow } from "electron";
import { ThermalPrinter, PrinterTypes, CharacterSet } from "node-thermal-printer";
import { getLogger } from "./logger";
import { AppConfig } from "./config";

export type PrintPayload = {
  text?: string[];
  align?: "left" | "center" | "right";
  qr?: string;
  barcode?: string;
  logoUrl?: string;
  logoBase64?: string; // data URL or raw base64 PNG
  cut?: boolean;
  openDrawer?: boolean;
  beep?: boolean;
};

export type PrintJob = {
  action: "print_ticket" | "open_drawer" | "test_print" | "get_printers" | "get_status" | "beep";
  printer?: string;
  copies?: number;
  cut?: boolean;
  openDrawer?: boolean;
  payload?: PrintPayload;
};

function buildPrinter(cfg: AppConfig, override?: string): ThermalPrinter {
  const target = override || cfg.printerInterface || (cfg.printerName ? `printer:${cfg.printerName}` : "");
  if (!target) throw new Error("No hay impresora configurada");
  return new ThermalPrinter({
    type: PrinterTypes.EPSON,
    interface: target,
    width: cfg.printerWidth === 58 ? 32 : 48,
    characterSet: CharacterSet.PC850_MULTILINGUAL,
    removeSpecialCharacters: false,
    options: { timeout: 5000 },
  });
}

export async function getPrinters(): Promise<string[]> {
  // Use a hidden BrowserWindow to enumerate system printers
  const win = new BrowserWindow({ show: false, webPreferences: { offscreen: true } });
  try {
    await win.loadURL("about:blank");
    const list = await win.webContents.getPrintersAsync();
    return list.map((p) => p.name);
  } finally {
    win.destroy();
  }
}

export async function testPrint(cfg: AppConfig): Promise<void> {
  const log = getLogger();
  const p = buildPrinter(cfg);
  const ok = await p.isPrinterConnected();
  if (!ok) {
    log.error("Impresora desconectada en testPrint");
    throw new Error("Impresora desconectada");
  }
  p.alignCenter();
  p.bold(true);
  p.setTextDoubleHeight();
  p.println("CATA PRINT SERVICE");
  p.setTextNormal();
  p.bold(false);
  p.drawLine();
  p.alignLeft();
  p.println(`Impresora: ${cfg.printerName ?? "(default)"}`);
  p.println(`Ancho: ${cfg.printerWidth}mm`);
  p.println(`Fecha: ${new Date().toLocaleString("es-AR")}`);
  p.drawLine();
  p.alignCenter();
  p.println("PRUEBA DE IMPRESION OK");
  p.newLine();
  p.newLine();
  if (cfg.cutEnabled) p.cut();
  await p.execute();
  log.info("Test print enviado");
}

export async function openDrawer(cfg: AppConfig): Promise<void> {
  const p = buildPrinter(cfg);
  const ok = await p.isPrinterConnected();
  if (!ok) throw new Error("Impresora desconectada");
  p.openCashDrawer();
  await p.execute();
  getLogger().info("Cajón abierto");
}

export async function beep(cfg: AppConfig): Promise<void> {
  const p = buildPrinter(cfg);
  // ESC B n t — beep raw command (works on most ESC/POS thermal printers)
  p.raw(Buffer.from([0x1b, 0x42, 0x03, 0x02]));
  await p.execute();
}

export async function printTicket(cfg: AppConfig, job: PrintJob): Promise<void> {
  const log = getLogger();
  const p = buildPrinter(cfg, job.printer ? `printer:${job.printer}` : undefined);
  const ok = await p.isPrinterConnected();
  if (!ok) {
    log.error("Impresora desconectada", { printer: job.printer ?? cfg.printerName });
    throw new Error("Impresora desconectada o sin papel");
  }
  const payload = job.payload ?? {};
  const copies = Math.max(1, Math.min(10, job.copies ?? 1));
  const doCut = job.cut ?? payload.cut ?? cfg.cutEnabled;
  const doDrawer = job.openDrawer ?? payload.openDrawer ?? false;

  for (let i = 0; i < copies; i++) {
    if (payload.logoBase64) {
      try {
        const b64 = payload.logoBase64.replace(/^data:image\/\w+;base64,/, "");
        await p.printImageBuffer(Buffer.from(b64, "base64"));
      } catch (e) {
        log.warn("Logo base64 falló", { err: String(e) });
      }
    } else if (payload.logoUrl) {
      try {
        await p.printImage(payload.logoUrl);
      } catch (e) {
        log.warn("Logo URL falló", { err: String(e) });
      }
    }
    switch (payload.align) {
      case "center": p.alignCenter(); break;
      case "right": p.alignRight(); break;
      default: p.alignLeft();
    }
    for (const line of payload.text ?? []) {
      p.println(line);
    }
    if (payload.qr) {
      p.alignCenter();
      p.printQR(payload.qr, { cellSize: 6, correction: "M", model: 2 });
    }
    if (payload.barcode) {
      p.alignCenter();
      p.printBarcode(payload.barcode, 73, { width: 2, height: 80, hriPos: 2, hriFont: 0 });
    }
    p.newLine();
    if (doDrawer) p.openCashDrawer();
    if (payload.beep || cfg.beepOnPrint) p.beep();
    if (doCut) p.cut();
  }
  await p.execute();
  log.info("Ticket impreso", { copies, printer: job.printer ?? cfg.printerName });
}
