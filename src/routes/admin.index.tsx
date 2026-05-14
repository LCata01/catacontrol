import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { money, dt } from "@/lib/format";
import { useEffect } from "react";

export const Route = createFileRoute("/admin/")({
  component: LiveOps,
});

function LiveOps() {
  const { data, refetch } = useQuery({
    queryKey: ["live-ops"],
    queryFn: async () => {
      const [{ data: event }, { data: shifts }, { data: sales }, { data: cons }, { data: comps }] = await Promise.all([
        supabase.from("events").select("*").eq("status", "active").maybeSingle(),
        supabase.from("shifts").select("*, profiles!shifts_user_id_fkey(username), bars(name), entries(name)").eq("status", "open"),
        supabase.from("sales").select("id, total, payment_method, bar_id, entry_id, shift_id, cancelled, sale_items(item_kind, quantity)"),
        supabase.from("staff_consumptions").select("id, quantity"),
        supabase.from("complimentary_tickets").select("id, quantity"),
      ]);
      return { event, shifts: shifts ?? [], sales: sales ?? [], cons: cons ?? [], comps: comps ?? [] };
    },
    refetchInterval: 5000,
  });

  useEffect(() => { refetch(); }, [refetch]);

  if (!data) return <div className="text-muted-foreground">Loading…</div>;

  const liveSales = data.sales.filter((s: any) => !s.cancelled);
  const totalRev = liveSales.reduce((s: number, x: any) => s + Number(x.total), 0);
  const barRev = liveSales.filter((s: any) => s.bar_id).reduce((s: number, x: any) => s + Number(x.total), 0);
  const entryRev = liveSales.filter((s: any) => s.entry_id).reduce((s: number, x: any) => s + Number(x.total), 0);
  const byPay = { cash: 0, qr: 0, card: 0 } as any;
  for (const s of liveSales) byPay[s.payment_method] = (byPay[s.payment_method] || 0) + Number(s.total);
  const products = liveSales.flatMap((s: any) => s.sale_items ?? []).filter((i: any) => i.item_kind === "product").reduce((sum: number, i: any) => sum + i.quantity, 0);
  const paidTickets = liveSales.flatMap((s: any) => s.sale_items ?? []).filter((i: any) => i.item_kind === "ticket").reduce((sum: number, i: any) => sum + i.quantity, 0);
  const wristbandsSold = liveSales.flatMap((s: any) => s.sale_items ?? []).filter((i: any) => i.item_kind === "wristband").reduce((sum: number, i: any) => sum + i.quantity, 0);
  const consQty = data.cons.reduce((s: number, x: any) => s + x.quantity, 0);
  const compQty = data.comps.reduce((s: number, x: any) => s + x.quantity, 0);

  const barShifts = data.shifts.filter((s: any) => s.kind === "bar");
  const entryShifts = data.shifts.filter((s: any) => s.kind === "entry");

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Active event</div>
        <div className="text-3xl font-black">{data.event?.name ?? "— No active event —"}</div>
        {data.event && <div className="text-sm text-muted-foreground">Capacity {data.event.capacity}</div>}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Stat k="Total revenue" v={money(totalRev)} big />
        <Stat k="Bar revenue" v={money(barRev)} />
        <Stat k="Entry revenue" v={money(entryRev)} />
        <Stat k="Cash" v={money(byPay.cash)} />
        <Stat k="QR" v={money(byPay.qr)} />
        <Stat k="Card" v={money(byPay.card)} />
        <Stat k="Products sold" v={String(products)} />
        <Stat k="Paid tickets" v={String(paidTickets)} />
        <Stat k="Wristbands sold" v={String(wristbandsSold)} />
        <Stat k="Staff consumptions" v={String(consQty)} />
        <Stat k="Free tickets" v={String(compQty)} />
        <Stat k="Open shifts" v={String(data.shifts.length)} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel title={`Active bars (${barShifts.length})`}>
          {barShifts.length === 0 && <p className="text-sm text-muted-foreground">No active bar shifts.</p>}
          {barShifts.map((s: any) => <ShiftRow key={s.id} s={s} sales={liveSales} />)}
        </Panel>
        <Panel title={`Active entries (${entryShifts.length})`}>
          {entryShifts.length === 0 && <p className="text-sm text-muted-foreground">No active entry shifts.</p>}
          {entryShifts.map((s: any) => <ShiftRow key={s.id} s={s} sales={liveSales} />)}
        </Panel>
      </div>
    </div>
  );
}

function Stat({ k, v, big }: { k: string; v: string; big?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{k}</div>
      <div className={`mt-1 font-black ${big ? "text-3xl" : "text-xl"}`}>{v}</div>
    </div>
  );
}
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 text-sm font-bold uppercase tracking-widest">{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
function ShiftRow({ s, sales }: { s: any; sales: any[] }) {
  const mine = sales.filter((x: any) => x.shift_id === s.id);
  const total = mine.reduce((sum, x) => sum + Number(x.total), 0);
  const place = s.bars?.name || s.entries?.name;
  return (
    <div className="flex items-center justify-between rounded-lg border border-border p-3">
      <div>
        <div className="font-bold">{place} · {s.profiles?.username}</div>
        <div className="text-xs text-muted-foreground">Open since {dt(s.opened_at)}</div>
      </div>
      <div className="text-right">
        <div className="text-lg font-black">{money(total)}</div>
        <div className="text-xs text-muted-foreground">{mine.length} sales</div>
      </div>
    </div>
  );
}
