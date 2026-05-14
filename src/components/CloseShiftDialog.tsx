import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { money, dt } from "@/lib/format";

export function CloseShiftDialog({
  shift, kind, onClose, onClosed,
}: {
  shift: any; kind: "bar" | "entry"; onClose: () => void; onClosed: () => void;
}) {
  const [actual, setActual] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: summary } = useQuery({
    queryKey: ["close-summary", shift.id],
    queryFn: async () => {
      const [{ data: sales }, { data: items }, { data: cons }, { data: comps }] = await Promise.all([
        supabase.from("sales").select("*").eq("shift_id", shift.id),
        supabase.from("sale_items").select("*, sales!inner(shift_id)").eq("sales.shift_id", shift.id),
        supabase.from("staff_consumptions").select("*").eq("shift_id", shift.id),
        supabase.from("complimentary_tickets").select("*").eq("shift_id", shift.id),
      ]);
      return { sales: sales ?? [], items: items ?? [], cons: cons ?? [], comps: comps ?? [] };
    },
  });

  const totals = (() => {
    if (!summary) return null;
    const byPay: Record<string, number> = { cash: 0, qr: 0, card: 0 };
    let revenue = 0;
    for (const s of summary.sales) {
      if (s.cancelled) continue;
      byPay[s.payment_method] = (byPay[s.payment_method] || 0) + Number(s.total);
      revenue += Number(s.total);
    }
    const expectedCash = Number(shift.initial_cash) + (byPay.cash || 0);
    return { byPay, revenue, expectedCash };
  })();

  const confirm = async () => {
    setBusy(true);
    const { error } = await supabase.from("shifts").update({
      status: "closed", closed_at: new Date().toISOString(), actual_cash: Number(actual || 0),
    }).eq("id", shift.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Shift closed");
    onClosed();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-bold">CLOSE {kind.toUpperCase()} SHIFT</h3>
          <button onClick={onClose} className="text-2xl text-muted-foreground">×</button>
        </div>
        <div className="grid gap-2 text-sm">
          <Row k="Shift start" v={dt(shift.opened_at)} />
          <Row k="Shift end" v={dt(new Date().toISOString())} />
          <Row k="Initial cash" v={money(shift.initial_cash)} />
          <Row k="Sales" v={String(summary?.sales.filter((s: any) => !s.cancelled).length ?? 0)} />
          {kind === "bar" && <Row k="Staff consumptions" v={String(summary?.cons.length ?? 0)} />}
          {kind === "entry" && <Row k="Complimentary tickets" v={String(summary?.comps.length ?? 0)} />}
          <Row k="Cash payments" v={money(totals?.byPay.cash ?? 0)} />
          <Row k="QR payments" v={money(totals?.byPay.qr ?? 0)} />
          <Row k="Card payments" v={money(totals?.byPay.card ?? 0)} />
          <Row k="Total revenue" v={money(totals?.revenue ?? 0)} bold />
          <Row k="Expected cash" v={money(totals?.expectedCash ?? 0)} bold />
        </div>
        <div className="mt-4">
          <label className="mb-2 block text-xs uppercase tracking-widest text-muted-foreground">Actual cash counted</label>
          <input type="number" inputMode="decimal" value={actual} onChange={(e) => setActual(e.target.value)}
            className="w-full rounded-lg border border-border bg-input px-4 py-3 text-xl outline-none focus:ring-2 ring-ring"
            placeholder="0" />
          {actual !== "" && totals && (
            <div className={`mt-2 text-sm ${Number(actual) - totals.expectedCash === 0 ? "text-success" : "text-destructive"}`}>
              Difference: {money(Number(actual) - totals.expectedCash)}
            </div>
          )}
        </div>
        <button disabled={busy || actual === ""} onClick={confirm}
          className="mt-6 w-full rounded-lg bg-destructive py-4 font-bold uppercase tracking-widest text-destructive-foreground disabled:opacity-50">
          Close shift permanently
        </button>
      </div>
    </div>
  );
}

function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between border-b border-border py-1.5 ${bold ? "font-bold" : ""}`}>
      <span className="text-muted-foreground">{k}</span>
      <span>{v}</span>
    </div>
  );
}
