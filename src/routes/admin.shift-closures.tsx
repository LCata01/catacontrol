import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { dt, money } from "@/lib/format";
import { printShiftCloseTicketBrowser } from "@/lib/printer";

export const Route = createFileRoute("/admin/shift-closures")({ component: ShiftClosuresPage });

function ShiftClosuresPage() {
  const [kind, setKind] = useState<"bar" | "entry">("bar");
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["closed-shifts", kind],
    queryFn: async () => {
      const [{ data: shifts }, { data: profiles }, { data: bars }, { data: entries }] =
        await Promise.all([
          supabase
            .from("shifts")
            .select("*")
            .eq("status", "closed")
            .eq("kind", kind)
            .order("closed_at", { ascending: false })
            .limit(200),
          supabase.from("profiles").select("id, username, display_name"),
          supabase.from("bars").select("id, name"),
          supabase.from("entries").select("id, name"),
        ]);
      const P: Record<string, any> = {};
      profiles?.forEach((p: any) => (P[p.id] = p));
      const B: Record<string, any> = {};
      bars?.forEach((b: any) => (B[b.id] = b));
      const E: Record<string, any> = {};
      entries?.forEach((e: any) => (E[e.id] = e));
      return (shifts ?? []).map((s: any) => ({
        ...s,
        user: P[s.user_id]?.display_name || P[s.user_id]?.username || "—",
        place: s.kind === "bar" ? B[s.bar_id]?.name : E[s.entry_id]?.name,
      }));
    },
  });

  const reprint = async (shift: any) => {
    setBusyId(shift.id);
    try {
      const [{ data: sales }, { data: items }, { data: cons }, { data: comps }, { data: prof }, { data: place }, { data: branding }] = await Promise.all([
        supabase.from("sales").select("*").eq("shift_id", shift.id),
        supabase.from("sale_items").select("*, sales!inner(shift_id)").eq("sales.shift_id", shift.id),
        supabase.from("staff_consumptions").select("*").eq("shift_id", shift.id),
        supabase.from("complimentary_tickets").select("*").eq("shift_id", shift.id),
        supabase.from("profiles").select("username").eq("id", shift.user_id).maybeSingle(),
        shift.kind === "bar"
          ? supabase.from("bars").select("name").eq("id", shift.bar_id).maybeSingle()
          : supabase.from("entries").select("name").eq("id", shift.entry_id).maybeSingle(),
        supabase.from("app_settings").select("*").maybeSingle(),
      ]);

      const safe = { sales: sales ?? [], items: items ?? [], cons: cons ?? [], comps: comps ?? [] };
      const byPay: Record<string, number> = { cash: 0, qr: 0, card: 0 };
      let revenue = 0, paidCount = 0;
      for (const s of safe.sales) {
        if (s.cancelled) continue;
        byPay[s.payment_method] = (byPay[s.payment_method] || 0) + Number(s.total);
        revenue += Number(s.total);
        paidCount++;
      }
      let productsSold = 0, ticketsSold = 0, wristbandsSold = 0, peoplePaid = 0;
      const ticketBreakdown = new Map<string, { qty: number; people: number }>();
      const wristbandBreakdown = new Map<string, { qty: number }>();
      const productBreakdown = new Map<string, { qty: number }>();
      const cancelledIds = new Set(safe.sales.filter((s: any) => s.cancelled).map((s: any) => s.id));
      for (const it of safe.items) {
        if (cancelledIds.has((it as any).sale_id)) continue;
        const q = Number(it.quantity || 0);
        const nm = String(it.name || "—");
        if (it.item_kind === "product") {
          productsSold += q;
          const c = productBreakdown.get(nm) ?? { qty: 0 };
          productBreakdown.set(nm, { qty: c.qty + q });
        } else if (it.item_kind === "ticket") {
          ticketsSold += q;
          const people = Number(it.people_count || 0);
          peoplePaid += people;
          const c = ticketBreakdown.get(nm) ?? { qty: 0, people: 0 };
          ticketBreakdown.set(nm, { qty: c.qty + q, people: c.people + people });
        } else if (it.item_kind === "wristband") {
          wristbandsSold += q;
          const c = wristbandBreakdown.get(nm) ?? { qty: 0 };
          wristbandBreakdown.set(nm, { qty: c.qty + q });
        }
      }
      const consBreakdown = new Map<string, { qty: number }>();
      for (const c of safe.cons) {
        const nm = String((c as any).product_name || "—");
        const q = Number((c as any).quantity || 0);
        const cur = consBreakdown.get(nm) ?? { qty: 0 };
        consBreakdown.set(nm, { qty: cur.qty + q });
      }
      const compBreakdown = new Map<string, { qty: number; people: number }>();
      for (const c of safe.comps) {
        const nm = String((c as any).ticket_category || "—");
        const q = Number((c as any).quantity || 0);
        const people = Number((c as any).people_count || (c as any).quantity || 0);
        const cur = compBreakdown.get(nm) ?? { qty: 0, people: 0 };
        compBreakdown.set(nm, { qty: cur.qty + q, people: cur.people + people });
      }
      const compsCount = safe.comps.reduce((s: number, x: any) => s + Number(x.quantity || 0), 0);
      const peopleComp = safe.comps.reduce((s: number, x: any) => s + Number(x.people_count || x.quantity || 0), 0);
      const consCount = safe.cons.reduce((s: number, x: any) => s + Number(x.quantity || 0), 0);

      await printShiftCloseTicket({
        branding: (branding ?? {}) as any,
        kind: shift.kind,
        placeName: (place as any)?.name ?? "—",
        cashier: prof?.username ?? "—",
        openedAt: shift.opened_at,
        closedAt: shift.closed_at ?? new Date().toISOString(),
        initialCash: Number(shift.initial_cash || 0),
        byPay: { cash: byPay.cash || 0, qr: byPay.qr || 0, card: byPay.card || 0 },
        revenue,
        paidCount,
        productsSold,
        consCount,
        ticketsSold,
        peoplePaid,
        wristbandsSold,
        compsCount,
        peopleComp,
        ticketsByCategory: Array.from(ticketBreakdown.entries()).map(([name, v]) => ({ name, qty: v.qty, people: v.people })).sort((a, b) => b.qty - a.qty),
        wristbandsByCategory: Array.from(wristbandBreakdown.entries()).map(([name, v]) => ({ name, qty: v.qty })).sort((a, b) => b.qty - a.qty),
        compsByCategory: Array.from(compBreakdown.entries()).map(([name, v]) => ({ name, qty: v.qty, people: v.people })).sort((a, b) => b.qty - a.qty),
        productsByCategory: Array.from(productBreakdown.entries()).map(([name, v]) => ({ name, qty: v.qty })).sort((a, b) => b.qty - a.qty),
        consByCategory: Array.from(consBreakdown.entries()).map(([name, v]) => ({ name, qty: v.qty })).sort((a, b) => b.qty - a.qty),
      });
      toast.success("Corte de caja enviado a impresión");
    } catch (e: any) {
      toast.error(e?.message ?? "Error al imprimir");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black uppercase">Corte de Cajas</h2>
        <p className="text-sm text-muted-foreground">
          Reimprimir el ticket de cierre de cajas ya cerradas (por si la cajera olvidó imprimirlo).
        </p>
      </div>

      <div className="flex gap-2">
        {(["bar", "entry"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={`rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-widest ${kind === k ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
          >
            {k === "bar" ? "Barras" : "Entradas"}
          </button>
        ))}
      </div>

      <div className="overflow-auto rounded-xl border border-border bg-card">
        {!data ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Cargando…</div>
        ) : data.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Sin cajas cerradas</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Puesto</th>
                <th className="px-4 py-2">Usuario</th>
                <th className="px-4 py-2">Apertura</th>
                <th className="px-4 py-2">Cierre</th>
                <th className="px-4 py-2">Efectivo inicial</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {data.map((s: any) => (
                <tr key={s.id} className="border-t border-border">
                  <td className="px-4 py-3 font-bold">{s.place ?? "—"}</td>
                  <td className="px-4 py-3">{s.user}</td>
                  <td className="px-4 py-3">{dt(s.opened_at)}</td>
                  <td className="px-4 py-3">{s.closed_at ? dt(s.closed_at) : "—"}</td>
                  <td className="px-4 py-3">{money(s.initial_cash)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => reprint(s)}
                      disabled={busyId === s.id}
                      className="rounded-lg bg-primary px-4 py-2 text-xs font-bold uppercase tracking-widest text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                      {busyId === s.id ? "Imprimiendo…" : "Imprimir corte"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
