type Line = { left: string; right: string };

export function printTicket(opts: {
  title: string; subtitle?: string; number?: string;
  lines: Line[]; total?: number; payment?: string;
  guest?: string; notes?: string;
}) {
  if (typeof window === "undefined") return;
  const w = window.open("", "PRINT", "width=420,height=640");
  if (!w) return;
  const fmt = (n: number) => "$" + n.toLocaleString("es-AR");
  const html = `<!doctype html><html><head><title>${opts.title}</title>
  <style>
    @page { margin: 4mm; }
    body { font: 12px/1.35 'Courier New', monospace; color: #000; padding: 6px; }
    h1 { font-size: 16px; margin: 0 0 2px; text-align: center; letter-spacing: 1px; }
    .sub { text-align: center; font-size: 10px; margin-bottom: 6px; }
    .row { display: flex; justify-content: space-between; }
    hr { border: 0; border-top: 1px dashed #000; margin: 6px 0; }
    .total { font-weight: bold; font-size: 14px; }
    .center { text-align: center; }
  </style></head><body>
  <h1>CATA CONTROL</h1>
  <div class="sub">${opts.title}${opts.number ? " · " + opts.number : ""}</div>
  ${opts.subtitle ? `<div class="sub">${opts.subtitle}</div>` : ""}
  <div class="sub">${new Date().toLocaleString("es-AR", { hour12: false })}</div>
  <hr/>
  ${opts.guest ? `<div>Invitado: <b>${opts.guest}</b></div>` : ""}
  ${opts.notes ? `<div>Notas: ${opts.notes}</div>` : ""}
  ${opts.lines.map(l => `<div class="row"><span>${l.left}</span><span>${l.right}</span></div>`).join("")}
  <hr/>
  ${typeof opts.total === "number" ? `<div class="row total"><span>TOTAL</span><span>${fmt(opts.total)}</span></div>` : ""}
  ${opts.payment ? `<div class="row"><span>PAGO</span><span>${opts.payment.toUpperCase()}</span></div>` : ""}
  <div class="center" style="margin-top:8px">— Gracias —</div>
  <script>window.onload=()=>{window.print();setTimeout(()=>window.close(),300)}</script>
  </body></html>`;
  w.document.write(html);
  w.document.close();
}
