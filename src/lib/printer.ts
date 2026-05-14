import { connectQz, getSavedPrinter, printRaw } from "./qz";

type Line = { qty: number; name: string; unit: number; subtotal: number };

export type TicketBranding = {
  nightclub_name?: string;
  slogan?: string;
  logo_url?: string | null;
};

export type BarTicketOpts = {
  branding: TicketBranding;
  number: string | number;
  bar: string;
  cashier: string;
  event?: string;
  lines: Line[];
  total: number;
  payment: string;
};

// ----------------- ESC/POS helpers -----------------
const ESC = "\x1B";
const GS = "\x1D";
const INIT = ESC + "@";
const ALIGN_L = ESC + "a" + "\x00";
const ALIGN_C = ESC + "a" + "\x01";
const BOLD_ON = ESC + "E" + "\x01";
const BOLD_OFF = ESC + "E" + "\x00";
const SIZE_NORMAL = GS + "!" + "\x00";
const SIZE_DBL = GS + "!" + "\x11";
const SIZE_DBL_W = GS + "!" + "\x10";
const CUT = GS + "V" + "B" + "\x03";
const FEED = (n: number) => ESC + "d" + String.fromCharCode(n);

const COLS = 42;

function pad(s: string, n: number) {
  if (s.length >= n) return s.slice(0, n);
  return s + " ".repeat(n - s.length);
}
function padL(s: string, n: number) {
  if (s.length >= n) return s.slice(0, n);
  return " ".repeat(n - s.length) + s;
}
function hr(ch = "-") {
  return ch.repeat(COLS) + "\n";
}
function money(n: number) {
  return "$" + Number(n).toLocaleString("es-AR");
}

function buildEscPos(opts: BarTicketOpts): string {
  const name = (opts.branding.nightclub_name || "CATA CLUB").toUpperCase();
  const slogan = opts.branding.slogan || "";
  const now = new Date();
  const date = now.toLocaleDateString("es-AR");
  const time = now.toLocaleTimeString("es-AR", { hour12: false });

  let out = "";
  out += INIT;
  out += ALIGN_C + SIZE_DBL + BOLD_ON + name + "\n" + BOLD_OFF + SIZE_NORMAL;
  if (slogan) out += slogan + "\n";
  out += hr("=");

  out += ALIGN_L;
  out += pad("FECHA", 10) + padL(date, COLS - 10) + "\n";
  out += pad("HORA", 10) + padL(time, COLS - 10) + "\n";
  out += pad("BARRA", 10) + padL(opts.bar, COLS - 10) + "\n";
  out += pad("CAJERO", 10) + padL(opts.cashier, COLS - 10) + "\n";
  if (opts.event) out += pad("EVENTO", 10) + padL(opts.event, COLS - 10) + "\n";
  out += hr();

  const cQty = 4, cName = 20, cUnit = 8, cTot = COLS - cQty - cName - cUnit;
  out += BOLD_ON;
  out += pad("CNT", cQty) + pad("PRODUCTO", cName) + padL("P.U", cUnit) + padL("TOTAL", cTot) + "\n";
  out += BOLD_OFF;
  out += hr();
  for (const l of opts.lines) {
    const nm = l.name.length > cName ? l.name.slice(0, cName) : l.name;
    out += pad(String(l.qty), cQty) + pad(nm, cName) + padL(money(l.unit), cUnit) + padL(money(l.subtotal), cTot) + "\n";
    if (l.name.length > cName) {
      out += pad("", cQty) + pad(l.name.slice(cName, cName * 2), cName) + "\n";
    }
  }
  out += hr();

  out += BOLD_ON + SIZE_DBL_W;
  out += pad("TOTAL", 10) + padL(money(opts.total), COLS - 10) + "\n";
  out += SIZE_NORMAL + BOLD_OFF;
  out += pad("PAGO", 10) + padL(opts.payment.toUpperCase(), COLS - 10) + "\n";
  out += hr();

  out += ALIGN_C + "Gracias por su compra!\n";
  out += `TICKET #${opts.number}\n`;
  out += ALIGN_L;
  out += FEED(2);
  out += CUT;
  return out;
}

// ----------------- Staff drink ticket -----------------

export type StaffTicketOpts = {
  branding: TicketBranding;
  event?: string;
  staffName: string;
  staffCategory?: string;
  items: { name: string; qty: number }[];
};

function buildStaffEscPos(opts: StaffTicketOpts): string {
  const name = (opts.branding.nightclub_name || "CATA CLUB").toUpperCase();
  const now = new Date();
  const date = now.toLocaleDateString("es-AR");
  const time = now.toLocaleTimeString("es-AR", { hour12: false });

  let out = "";
  out += INIT;
  out += ALIGN_C + SIZE_DBL + BOLD_ON + name + "\n" + BOLD_OFF + SIZE_NORMAL;
  out += hr("=");
  out += ALIGN_C + SIZE_DBL + BOLD_ON + "STAFF DRINK\n" + BOLD_OFF + SIZE_NORMAL;
  out += hr();

  out += ALIGN_L;
  if (opts.event) out += pad("EVENTO", 10) + padL(opts.event, COLS - 10) + "\n";
  out += pad("FECHA", 10) + padL(date, COLS - 10) + "\n";
  out += pad("HORA", 10) + padL(time, COLS - 10) + "\n";
  out += pad("PARA", 10) + padL(opts.staffName, COLS - 10) + "\n";
  if (opts.staffCategory) out += pad("ROL", 10) + padL(opts.staffCategory.toUpperCase(), COLS - 10) + "\n";
  out += hr();

  out += ALIGN_C;
  for (const it of opts.items) {
    out += SIZE_DBL + BOLD_ON + (it.name.toUpperCase()) + "\n" + BOLD_OFF + SIZE_NORMAL;
    out += SIZE_DBL_W + "x" + it.qty + "\n" + SIZE_NORMAL;
    out += "\n";
  }
  out += ALIGN_L;
  out += hr();
  out += ALIGN_C + "CORTESIA STAFF\n";
  out += ALIGN_L;
  out += FEED(2);
  out += CUT;
  return out;
}

// ----------------- Public API (QZ Tray ONLY) -----------------

function ensureConfigured() {
  if (typeof window === "undefined") {
    throw new Error("La impresión solo está disponible en el navegador.");
  }
  if (!getSavedPrinter()) {
    throw new Error("No hay impresora configurada. Configurala en Admin → Impresión.");
  }
}

export async function printBarTicket(opts: BarTicketOpts) {
  ensureConfigured();
  await connectQz();
  const data = buildEscPos(opts);
  await printRaw([{ type: "raw", format: "plain", data }]);
}

export async function printStaffTicket(opts: StaffTicketOpts) {
  ensureConfigured();
  await connectQz();
  const data = buildStaffEscPos(opts);
  await printRaw([{ type: "raw", format: "plain", data }]);
}
