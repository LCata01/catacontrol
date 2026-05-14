type Line = { qty: number; name: string; unit: number; subtotal: number };

export type TicketBranding = {
  nightclub_name?: string;
  slogan?: string;
  logo_url?: string | null;
};

export function printBarTicket(opts: {
  branding: TicketBranding;
  number: string | number;
  bar: string;
  cashier: string;
  event?: string;
  lines: Line[];
  total: number;
  payment: string;
}) {
  if (typeof window === "undefined") return;
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
        <td>${escape(l.name)}</td>
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

function escape(s: string) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
