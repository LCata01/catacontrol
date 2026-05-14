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
  const [busy, setBusy] = useState(false);

  const { data: summary } = useQuery({
    queryKey: ["close-summary", shift.id],
    queryFn: async () => {
      const [{ data: sales }, { data: items }, { data: cons }, { data: comps }, { data: prof }, { data: place }] = await Promise.all([
        supabase.from("sales").select("*").eq("shift_id", shift.id),
        supabase.from("sale_items").select("*, sales!inner(shift_id)").eq("sales.shift_id", shift.id),
        supabase.from("staff_consumptions").select("*").eq("shift_id", shift.id),
        supabase.from("complimentary_tickets").select("*").eq("shift_id", shift.id),
        supabase.from("profiles").select("username").eq("id", shift.user_id).maybeSingle(),
        kind === "bar"
          ? supabase.from("bars").select("name").eq("id", shift.bar_id).maybeSingle()
          : supabase.from("entries").select("name").eq("id", shift.entry_id).maybeSingle(),
      ]);
      return {
        sales: sales ?? [], items: items ?? [], cons: cons ?? [], comps: comps ?? [],
        username: prof?.username ?? "—", placeName: (place as any)?.name ?? "—",
      };
    },
  });

  const totals = (() => {
    if (!summary) return null;
    const byPay: Record<string, number> = { cash: 0, qr: 0, card: 0 };
    let revenue = 0;
    let paidCount = 0;
    for (const s of summary.sales) {
      if (s.cancelled) continue;
      byPay[s.payment_method] = (byPay[s.payment_method] || 0) + Number(s.total);
      revenue += Number(s.total);
      paidCount++;
    }
    let productsSold = 0;
    let ticketsSold = 0;
    let wristbandsSold = 0;
    for (const it of summary.items) {
      const q = Number(it.quantity || 0);
      if (it.item_kind === "product") productsSold += q;
      else if (it.item_kind === "ticket") ticketsSold += q;
      else if (it.item_kind === "wristband") wristbandsSold += q;
    }
    const compsCount = summary.comps.reduce((s: number, x: any) => s + Number(x.quantity || 0), 0);
    const consCount = summary.cons.reduce((s: number, x: any) => s + Number(x.quantity || 0), 0);
    return { byPay, revenue, paidCount, productsSold, ticketsSold, wristbandsSold, compsCount, consCount };
  })();

  const confirm = async () => {
    setBusy(true);
    const { error } = await supabase.from("shifts").update({
      status: "closed", closed_at: new Date().toISOString(),
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
          <Row k="User" v={summary?.username ?? "…"} />
          <Row k={kind === "bar" ? "Bar" : "Entry terminal"} v={summary?.placeName ?? "…"} />
          <Row k="Initial cash" v={money(shift.initial_cash)} />

          {kind === "bar" && <>
            <Row k="Paid sales" v={String(totals?.paidCount ?? 0)} />
            <Row k="Products sold" v={String(totals?.productsSold ?? 0)} />
            <Row k="Staff consumptions" v={String(totals?.consCount ?? 0)} />
          </>}
          {kind === "entry" && <>
            <Row k="Paid tickets" v={String(totals?.ticketsSold ?? 0)} />
            <Row k="Wristbands sold" v={String(totals?.wristbandsSold ?? 0)} />
            <Row k="Complimentary tickets" v={String(totals?.compsCount ?? 0)} />
          </>}

          <div className="mt-2 border-t border-border pt-2 text-xs uppercase tracking-widest text-muted-foreground">Revenue by payment method</div>
          <Row k="Cash" v={money(totals?.byPay.cash ?? 0)} />
          <Row k="QR" v={money(totals?.byPay.qr ?? 0)} />
          <Row k="Card" v={money(totals?.byPay.card ?? 0)} />
          <Row k="Total revenue" v={money(totals?.revenue ?? 0)} bold />
        </div>

        <button disabled={busy} onClick={confirm}
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
