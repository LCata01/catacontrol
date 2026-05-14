// Ticket HTML builders. Output is sent to the local print agent through the
// PrintService abstraction (`@/lib/print`). Auto-cut is handled by the
// service after every job — never inlined into the HTML here.

import { getPrintService, getActivePrinter, printToActivePrinter } from "./print";

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

export type StaffTicketOpts = {
  branding: TicketBranding;
  event?: string;
  staffName: string;
  staffCategory?: string;
  items: { name: string; qty: number }[];
};

function money(n: number) {
  return "$" + Number(n).toLocaleString("es-AR");
}

function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const TICKET_CSS = `
  @page { size: 80mm auto; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; color: #000; }
  body { font-family: 'Courier New', ui-monospace, monospace; font-size: 12px; line-height: 1.3; padding: 4mm; width: 80mm; }
  .center { text-align: center; }
  .right { text-align: right; }
  .bold { font-weight: 700; }
  .big { font-size: 16px; font-weight: 700; }
  .huge { font-size: 22px; font-weight: 800; }
  .hr { border-top: 1px dashed #000; margin: 4px 0; }
  .hr2 { border-top: 2px solid #000; margin: 4px 0; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 1px 0; vertical-align: top; }
  .col-qty { width: 22px; }
  .col-unit, .col-tot { white-space: nowrap; text-align: right; padding-left: 4px; }
  .row { display: flex; justify-content: space-between; gap: 8px; }
  .muted { font-size: 11px; }
  @media print { body { width: auto; } }
`;

function buildBarHtml(opts: BarTicketOpts): string {
  const name = (opts.branding.nightclub_name || "CATA CLUB").toUpperCase();
  const slogan = opts.branding.slogan || "";
  const now = new Date();
  const date = now.toLocaleDateString("es-AR");
  const time = now.toLocaleTimeString("es-AR", { hour12: false });

  const lines = opts.lines
    .map(
      (l) => `
        <tr>
          <td class="col-qty">${l.qty}</td>
          <td>${escapeHtml(l.name)}</td>
          <td class="col-unit">${money(l.unit)}</td>
          <td class="col-tot">${money(l.subtotal)}</td>
        </tr>`,
    )
    .join("");

  return `<!doctype html><html><head><meta charset="utf-8"><title>Ticket #${opts.number}</title><style>${TICKET_CSS}</style></head><body>
    <div class="center big">${escapeHtml(name)}</div>
    ${slogan ? `<div class="center muted">${escapeHtml(slogan)}</div>` : ""}
    <div class="hr2"></div>
    <div class="row"><span>FECHA</span><span>${date}</span></div>
    <div class="row"><span>HORA</span><span>${time}</span></div>
    <div class="row"><span>BARRA</span><span>${escapeHtml(opts.bar)}</span></div>
    <div class="row"><span>CAJERO</span><span>${escapeHtml(opts.cashier)}</span></div>
    ${opts.event ? `<div class="row"><span>EVENTO</span><span>${escapeHtml(opts.event)}</span></div>` : ""}
    <div class="hr"></div>
    <table>
      <tr class="bold"><td class="col-qty">CNT</td><td>PRODUCTO</td><td class="col-unit">P.U</td><td class="col-tot">TOTAL</td></tr>
      ${lines}
    </table>
    <div class="hr"></div>
    <div class="row huge"><span>TOTAL</span><span>${money(opts.total)}</span></div>
    <div class="row"><span>PAGO</span><span>${escapeHtml(opts.payment.toUpperCase())}</span></div>
    <div class="hr"></div>
    <div class="center">Gracias por su compra!</div>
    <div class="center bold">TICKET #${opts.number}</div>
    <div style="height:8mm"></div>
  </body></html>`;
}

function buildStaffHtml(opts: StaffTicketOpts): string {
  const name = (opts.branding.nightclub_name || "CATA CLUB").toUpperCase();
  const now = new Date();
  const date = now.toLocaleDateString("es-AR");
  const time = now.toLocaleTimeString("es-AR", { hour12: false });

  const items = opts.items
    .map(
      (it) => `
        <div class="center big">${escapeHtml(it.name.toUpperCase())}</div>
        <div class="center huge">x${it.qty}</div>
        <div style="height:4mm"></div>`,
    )
    .join("");

  return `<!doctype html><html><head><meta charset="utf-8"><title>Staff Drink</title><style>${TICKET_CSS}</style></head><body>
    <div class="center big">${escapeHtml(name)}</div>
    <div class="hr2"></div>
    <div class="center big">STAFF DRINK</div>
    <div class="hr"></div>
    ${opts.event ? `<div class="row"><span>EVENTO</span><span>${escapeHtml(opts.event)}</span></div>` : ""}
    <div class="row"><span>FECHA</span><span>${date}</span></div>
    <div class="row"><span>HORA</span><span>${time}</span></div>
    <div class="row"><span>PARA</span><span>${escapeHtml(opts.staffName)}</span></div>
    ${opts.staffCategory ? `<div class="row"><span>ROL</span><span>${escapeHtml(opts.staffCategory.toUpperCase())}</span></div>` : ""}
    <div class="hr"></div>
    ${items}
    <div class="hr"></div>
    <div class="center bold">CORTESIA STAFF</div>
    <div style="height:8mm"></div>
  </body></html>`;
}

function printHtml(html: string) {
  if (typeof window === "undefined") return;
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const cleanup = () => {
    setTimeout(() => {
      try {
        document.body.removeChild(iframe);
      } catch {}
    }, 1000);
  };

  iframe.onload = () => {
    try {
      const win = iframe.contentWindow;
      if (!win) return cleanup();
      win.focus();
      win.print();
    } finally {
      cleanup();
    }
  };

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) {
    cleanup();
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();
}

export async function printBarTicket(opts: BarTicketOpts) {
  await printToActivePrinter({ html: buildBarHtml(opts), title: `Ticket #${opts.number}` });
}

export async function printStaffTicket(opts: StaffTicketOpts) {
  await printToActivePrinter({ html: buildStaffHtml(opts), title: "Staff drink" });
}

export type ShiftCloseTicketOpts = {
  branding: TicketBranding;
  kind: "bar" | "entry";
  placeName: string;
  cashier: string;
  openedAt: string | Date;
  closedAt: string | Date;
  initialCash: number;
  byPay: { cash: number; qr: number; card: number };
  revenue: number;
  // bar
  paidCount?: number;
  productsSold?: number;
  consCount?: number;
  // entry
  ticketsSold?: number;
  peoplePaid?: number;
  wristbandsSold?: number;
  compsCount?: number;
  peopleComp?: number;
  ticketsByCategory?: { name: string; qty: number; people: number }[];
  wristbandsByCategory?: { name: string; qty: number }[];
  compsByCategory?: { name: string; qty: number; people: number }[];
};

function buildShiftCloseHtml(o: ShiftCloseTicketOpts): string {
  const name = (o.branding.nightclub_name || "CATA CLUB").toUpperCase();
  const open = new Date(o.openedAt);
  const close = new Date(o.closedAt);
  const fmt = (d: Date) =>
    `${d.toLocaleDateString("es-AR")} ${d.toLocaleTimeString("es-AR", { hour12: false })}`;

  const breakdownRows = (
    title: string,
    items: { name: string; qty: number; people?: number }[] | undefined,
    showPeople: boolean,
  ) => {
    if (!items || items.length === 0) return "";
    const rows = items
      .map(
        (it) =>
          `<div class="row"><span>&nbsp;&nbsp;${escapeHtml(it.name)}</span><span>${it.qty}${showPeople ? ` (${it.people ?? 0}p)` : ""}</span></div>`,
      )
      .join("");
    return `<div class="muted bold">${title}</div>${rows}`;
  };

  const barRows = o.kind === "bar"
    ? `
      <div class="row"><span>VENTAS PAGADAS</span><span>${o.paidCount ?? 0}</span></div>
      <div class="row"><span>PRODUCTOS</span><span>${o.productsSold ?? 0}</span></div>
      <div class="row"><span>CONSUMOS STAFF</span><span>${o.consCount ?? 0}</span></div>`
    : `
      <div class="row bold"><span>TICKETS PAGADOS</span><span>${o.ticketsSold ?? 0}</span></div>
      ${breakdownRows("POR CATEGORIA", o.ticketsByCategory, true)}
      <div class="row"><span>PERSONAS PAG.</span><span>${o.peoplePaid ?? 0}</span></div>
      <div class="hr"></div>
      <div class="row bold"><span>PULSERAS</span><span>${o.wristbandsSold ?? 0}</span></div>
      ${breakdownRows("POR CATEGORIA", o.wristbandsByCategory, false)}
      <div class="hr"></div>
      <div class="row bold"><span>CORTESIAS</span><span>${o.compsCount ?? 0}</span></div>
      ${breakdownRows("POR CATEGORIA", o.compsByCategory, true)}
      <div class="row"><span>PERSONAS CORT.</span><span>${o.peopleComp ?? 0}</span></div>
      <div class="row bold"><span>TOTAL PERSONAS</span><span>${(o.peoplePaid ?? 0) + (o.peopleComp ?? 0)}</span></div>`;

  return `<!doctype html><html><head><meta charset="utf-8"><title>Cierre de turno</title><style>${TICKET_CSS}</style></head><body>
    <div class="center big">${escapeHtml(name)}</div>
    <div class="hr2"></div>
    <div class="center big">CIERRE DE ${o.kind === "bar" ? "BARRA" : "ENTRADA"}</div>
    <div class="hr"></div>
    <div class="row"><span>${o.kind === "bar" ? "BARRA" : "TERMINAL"}</span><span>${escapeHtml(o.placeName)}</span></div>
    <div class="row"><span>CAJERO</span><span>${escapeHtml(o.cashier)}</span></div>
    <div class="row"><span>INICIO</span><span>${fmt(open)}</span></div>
    <div class="row"><span>FIN</span><span>${fmt(close)}</span></div>
    <div class="row"><span>EFECTIVO INICIAL</span><span>${money(o.initialCash)}</span></div>
    <div class="hr"></div>
    ${barRows}
    <div class="hr"></div>
    <div class="center bold">RECAUDACION</div>
    <div class="row"><span>EFECTIVO</span><span>${money(o.byPay.cash)}</span></div>
    <div class="row"><span>QR</span><span>${money(o.byPay.qr)}</span></div>
    <div class="row"><span>TARJETA</span><span>${money(o.byPay.card)}</span></div>
    <div class="hr"></div>
    <div class="row huge"><span>TOTAL</span><span>${money(o.revenue)}</span></div>
    <div style="height:8mm"></div>
  </body></html>`;
}

export async function printShiftCloseTicket(opts: ShiftCloseTicketOpts) {
  await printToActivePrinter({ html: buildShiftCloseHtml(opts), title: "Cierre de turno" });
}

/** Build the standardized 80mm CATACONTROL test ticket. */
export function buildTestTicketHtml(opts: { tenantName: string; terminalName: string }): string {
  const now = new Date();
  const date = now.toLocaleDateString("es-AR");
  const time = now.toLocaleTimeString("es-AR", { hour12: false });
  return `<!doctype html><html><head><meta charset="utf-8"><title>Prueba</title><style>${TICKET_CSS}</style></head><body>
    <div class="center big">CATACONTROL</div>
    <div class="hr2"></div>
    <div class="center bold">${escapeHtml(opts.tenantName.toUpperCase())}</div>
    <div class="hr"></div>
    <div class="row"><span>CAJA</span><span>${escapeHtml(opts.terminalName)}</span></div>
    <div class="row"><span>FECHA</span><span>${date}</span></div>
    <div class="row"><span>HORA</span><span>${time}</span></div>
    <div class="hr"></div>
    <div class="center huge">PRUEBA DE IMPRESIÓN</div>
    <div style="height:8mm"></div>
  </body></html>`;
}

/** Print the test ticket to a specific (not yet active) printer. */
export async function printTestTo(printerName: string, opts: { tenantName: string; terminalName: string }) {
  await getPrintService().printTest(printerName, buildTestTicketHtml(opts));
}

/** Legacy global "test print" — prints to the active session printer. */
export async function testPrint() {
  const a = getActivePrinter();
  if (!a) throw new Error("Seleccione una impresora primero");
  await getPrintService().printTest(
    a.name,
    buildTestTicketHtml({ tenantName: "CATACONTROL", terminalName: "—" }),
  );
}

