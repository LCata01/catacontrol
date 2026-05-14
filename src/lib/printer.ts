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
const SIZE_DBL = GS + "!" + "\x11"; // double width + height
const SIZE_DBL_W = GS + "!" + "\x10";
// Full cut with feed: GS V 66 n  (partial cut: 66/1, full cut: 65/0). Use full.
const CUT = GS + "V" + "B" + "\x03"; // feed 3 lines then full cut
const FEED = (n: number) => ESC + "d" + String.fromCharCode(n);

const COLS = 42; // typical 80mm at Font A is 42-48 cols; choose 42 for safety

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

  // Header columns: CANT(4) PRODUCTO(20) P.U(8) TOTAL(10) = 42
  const cQty = 4, cName = 20, cUnit = 8, cTot = COLS - cQty - cName - cUnit;
  out += BOLD_ON;
  out += pad("CNT", cQty) + pad("PRODUCTO", cName) + padL("P.U", cUnit) + padL("TOTAL", cTot) + "\n";
  out += BOLD_OFF;
  out += hr();
  for (const l of opts.lines) {
    const nm = l.name.length > cName ? l.name.slice(0, cName) : l.name;
    out += pad(String(l.qty), cQty) + pad(nm, cName) + padL(money(l.unit), cUnit) + padL(money(l.subtotal), cTot) + "\n";
    if (l.name.length > cName) {
      // continuation line for long names
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

export async function printStaffTicket(opts: StaffTicketOpts) {
  if (typeof window === "undefined") return;
  if (getSavedPrinter()) {
    try {
      await connectQz();
      const data = buildStaffEscPos(opts);
      await printRaw([{ type: "raw", format: "plain", data }]);
      return;
    } catch (err) {
      console.error("QZ print failed, falling back to browser print", err);
    }
  }
  printStaffTicketHtml(opts);
}

function printStaffTicketHtml(opts: StaffTicketOpts) {
  const w = window.open("", "PRINT", "width=360,height=720");
  if (!w) return;
  const now = new Date();
  const date = now.toLocaleDateString("es-AR");
  const time = now.toLocaleTimeString("es-AR", { hour12: false });
  const name = (opts.branding.nightclub_name || "CATA CLUB").toUpperCase();
  const logo = opts.branding.logo_url
    ? `<div class="logo"><img src="${opts.branding.logo_url}" alt=""/></div>` : "";
  const html = `<!doctype html><html><head><meta charset="utf-8"/><title>Staff Drink</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  html, body { width: 80mm; margin: 0; padding: 0; }
  body { font: 12px/1.35 'Courier New', ui-monospace, monospace; color: #000; padding: 4mm 3mm; text-align: center; }
  .logo img { max-width: 50mm; max-height: 18mm; margin: 0 auto 2mm; display: block; }
  .name { font-size: 18px; font-weight: 900; letter-spacing: 2px; }
  .badge { font-size: 22px; font-weight: 900; margin: 3mm 0; letter-spacing: 2px; }
  .meta { font-size: 11px; margin-top: 2mm; text-align: left; }
  .meta div { display: flex; justify-content: space-between; }
  hr { border: 0; border-top: 1px dashed #000; margin: 3mm 0; }
  .item { margin: 3mm 0; }
  .item .n { font-size: 22px; font-weight: 900; text-transform: uppercase; }
  .item .q { font-size: 28px; font-weight: 900; }
  .footer { margin-top: 4mm; font-size: 11px; font-weight: 700; }
</style></head><body>
  ${logo}
  <div class="name">${name}</div>
  <hr/>
  <div class="badge">STAFF DRINK</div>
  <hr/>
  <div class="meta">
    ${opts.event ? `<div><span>EVENTO</span><span>${esc(opts.event)}</span></div>` : ""}
    <div><span>FECHA</span><span>${date}</span></div>
    <div><span>HORA</span><span>${time}</span></div>
    <div><span>PARA</span><span>${esc(opts.staffName)}</span></div>
    ${opts.staffCategory ? `<div><span>ROL</span><span>${esc(opts.staffCategory.toUpperCase())}</span></div>` : ""}
  </div>
  <hr/>
  ${opts.items.map(i => `<div class="item"><div class="n">${esc(i.name)}</div><div class="q">x${i.qty}</div></div>`).join("")}
  <hr/>
  <div class="footer">CORTESIA STAFF</div>
  <script>window.onload=()=>{window.print();setTimeout(()=>window.close(),300)}</script>
</body></html>`;
  w.document.write(html);
  w.document.close();
}

// ----------------- Public API -----------------

export async function printBarTicket(opts: BarTicketOpts) {
  if (typeof window === "undefined") return;

  // Try QZ Tray first if a printer is configured
  if (getSavedPrinter()) {
    try {
      await connectQz();
      const data = buildEscPos(opts);
      await printRaw([{ type: "raw", format: "plain", data }]);
      return;
    } catch (err) {
      console.error("QZ print failed, falling back to browser print", err);
    }
  }

  // Fallback: browser HTML print
  printBarTicketHtml(opts);
}

function printBarTicketHtml(opts: BarTicketOpts) {
  const w = window.open("", "PRINT", "width=360,height=720");
  if (!w) return;
  const fmt = (n: number) => "$" + Number(n).toLocaleString("es-AR");
  const now = new Date();
  const date = now.toLocaleDateString("es-AR");
  const time = now.toLocaleTimeString("es-AR", { hour12: false });
  const name = (opts.branding.nightclub_name || "CATA CLUB").toUpperCase();
  const slogan = opts.branding.slogan || "";
  const logo = opts.branding.logo_url
    ? `<div class="logo"><img src="${opts.branding.logo_url}" alt=""/></div>` : "";

  const html = `<!doctype html><html><head><meta charset="utf-8"/><title>Ticket ${opts.number}</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  * { box-sizing: border-box; }
  html, body { width: 80mm; margin: 0; padding: 0; }
  body { font: 12px/1.35 'Courier New', ui-monospace, monospace; color: #000; padding: 4mm 3mm; text-align: center; }
  .logo img { max-width: 50mm; max-height: 18mm; margin: 0 auto 2mm; display: block; }
  .name { font-size: 18px; font-weight: 900; letter-spacing: 2px; }
  .slogan { font-size: 10px; font-style: italic; margin-top: 1mm; }
  .meta { font-size: 11px; margin-top: 2mm; text-align: left; }
  .meta div { display: flex; justify-content: space-between; }
  hr { border: 0; border-top: 1px dashed #000; margin: 3mm 0; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th, td { padding: 1px 0; text-align: left; }
  th.r, td.r { text-align: right; }
  th.c, td.c { text-align: center; }
  .total { font-size: 16px; font-weight: 900; display: flex; justify-content: space-between; margin-top: 2mm; }
  .pay { font-size: 12px; display: flex; justify-content: space-between; margin-top: 1mm; }
  .footer { margin-top: 4mm; font-size: 11px; }
  .num { font-size: 10px; margin-top: 2mm; letter-spacing: 1px; }
</style></head><body>
  ${logo}
  <div class="name">${name}</div>
  ${slogan ? `<div class="slogan">${slogan}</div>` : ""}
  <hr/>
  <div class="meta">
    <div><span>FECHA</span><span>${date}</span></div>
    <div><span>HORA</span><span>${time}</span></div>
    <div><span>BARRA</span><span>${opts.bar}</span></div>
    <div><span>CAJERO</span><span>${opts.cashier}</span></div>
    ${opts.event ? `<div><span>EVENTO</span><span>${opts.event}</span></div>` : ""}
  </div>
  <hr/>
  <table>
    <thead><tr><th class="c">CANT</th><th>PRODUCTO</th><th class="r">P.U</th><th class="r">TOTAL</th></tr></thead>
    <tbody>
      ${opts.lines.map(l => `<tr>
        <td class="c">${l.qty}</td>
        <td>${esc(l.name)}</td>
        <td class="r">${fmt(l.unit)}</td>
        <td class="r">${fmt(l.subtotal)}</td>
      </tr>`).join("")}
    </tbody>
  </table>
  <hr/>
  <div class="total"><span>TOTAL</span><span>${fmt(opts.total)}</span></div>
  <div class="pay"><span>PAGO</span><span>${opts.payment.toUpperCase()}</span></div>
  <hr/>
  <div class="footer">¡Gracias por su compra!</div>
  <div class="num">TICKET #${opts.number}</div>
  <script>window.onload=()=>{window.print();setTimeout(()=>window.close(),300)}</script>
</body></html>`;
  w.document.write(html);
  w.document.close();
}

function esc(s: string) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
