// Browser-based ticket printing. Renders the ticket as HTML inside a hidden
// iframe and triggers the browser's native print dialog. The user picks the
// printer once in the dialog and can mark it as default.

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
  printHtml(buildBarHtml(opts));
}

export async function printStaffTicket(opts: StaffTicketOpts) {
  printHtml(buildStaffHtml(opts));
}

export function testPrint() {
  printHtml(
    buildBarHtml({
      branding: { nightclub_name: "CATA CLUB" },
      number: "TEST",
      bar: "BARRA 1",
      cashier: "TEST",
      lines: [
        { qty: 1, name: "PRUEBA DE IMPRESION", unit: 0, subtotal: 0 },
      ],
      total: 0,
      payment: "test",
    }),
  );
}
