import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { money, dt } from "@/lib/format";
import { useEffect } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/")({
  component: LiveOps,
});

function LiveOps() {
  const { data, refetch } = useQuery({
    queryKey: ["live-ops"],
    queryFn: async () => {
      const { data: event } = await supabase.from("events").select("*").eq("status", "active").maybeSingle();
      if (!event) {
        return { event: null, shifts: [], sales: [], cons: [], comps: [] };
      }
      const [{ data: shifts }, { data: sales }, { data: cons }, { data: comps }] = await Promise.all([
        supabase.from("shifts").select("*, profiles!shifts_user_id_fkey(username), bars(name), entries(name)").eq("status", "open").eq("event_id", event.id),
        supabase.from("sales").select("id, total, payment_method, bar_id, entry_id, shift_id, cancelled, sale_items(item_kind, quantity, people_count)").eq("event_id", event.id),
        supabase.from("staff_consumptions").select("id, quantity").eq("event_id", event.id),
        supabase.from("complimentary_tickets").select("id, quantity, people_count").eq("event_id", event.id),
      ]);
      return { event, shifts: shifts ?? [], sales: sales ?? [], cons: cons ?? [], comps: comps ?? [] };
    },
    refetchInterval: 3000,
  });

  useEffect(() => {
    const ch = supabase.channel("admin-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => refetch())
      .on("postgres_changes", { event: "*", schema: "public", table: "shifts" }, () => refetch())
      .on("postgres_changes", { event: "*", schema: "public", table: "sales" }, () => refetch())
      .on("postgres_changes", { event: "*", schema: "public", table: "sale_items" }, () => refetch())
      .on("postgres_changes", { event: "*", schema: "public", table: "staff_consumptions" }, () => refetch())
      .on("postgres_changes", { event: "*", schema: "public", table: "complimentary_tickets" }, () => refetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [refetch]);

  const forceRelease = async (shiftId: string, name: string) => {
    if (!confirm(`¿Liberar el puesto ${name}? Se cerrará el turno activo.`)) return;
    const { error } = await supabase.from("shifts").update({
      status: "closed", closed_at: new Date().toISOString(),
    }).eq("id", shiftId);
    if (error) return toast.error(error.message);
    toast.success("Puesto liberado");
    refetch();
  };

  if (!data) return <div className="text-muted-foreground">Cargando…</div>;

  const liveSales = data.sales.filter((s: any) => !s.cancelled);
  const totalRev = liveSales.reduce((s: number, x: any) => s + Number(x.total), 0);
  const barRev = liveSales.filter((s: any) => s.bar_id).reduce((s: number, x: any) => s + Number(x.total), 0);
  const entryRev = liveSales.filter((s: any) => s.entry_id).reduce((s: number, x: any) => s + Number(x.total), 0);
  const byPay = { cash: 0, qr: 0, card: 0 } as any;
  for (const s of liveSales) byPay[s.payment_method] = (byPay[s.payment_method] || 0) + Number(s.total);
  const allItems = liveSales.flatMap((s: any) => s.sale_items ?? []);
  const products = allItems.filter((i: any) => i.item_kind === "product").reduce((sum: number, i: any) => sum + i.quantity, 0);
  const paidTickets = allItems.filter((i: any) => i.item_kind === "ticket").reduce((sum: number, i: any) => sum + i.quantity, 0);
  const peoplePaid = allItems.filter((i: any) => i.item_kind === "ticket").reduce((sum: number, i: any) => sum + Number(i.people_count || 0), 0);
  const wristbandsSold = allItems.filter((i: any) => i.item_kind === "wristband").reduce((sum: number, i: any) => sum + i.quantity, 0);
  const consQty = data.cons.reduce((s: number, x: any) => s + x.quantity, 0);
  const compQty = data.comps.reduce((s: number, x: any) => s + x.quantity, 0);
  const peopleComp = data.comps.reduce((s: number, x: any) => s + Number(x.people_count || x.quantity || 0), 0);

  const barShifts = data.shifts.filter((s: any) => s.kind === "bar");
  const entryShifts = data.shifts.filter((s: any) => s.kind === "entry");

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Evento activo</div>
        <div className="text-3xl font-black">{data.event?.name ?? "— Sin evento activo —"}</div>
        {data.event && <div className="text-sm text-muted-foreground">Capacidad {data.event.capacity}</div>}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Stat k="Recaudación total" v={money(totalRev)} big />
        <Stat k="Recaudación barra" v={money(barRev)} />
        <Stat k="Recaudación entrada" v={money(entryRev)} />
        <Stat k="Efectivo" v={money(byPay.cash)} />
        <Stat k="QR" v={money(byPay.qr)} />
        <Stat k="Tarjeta" v={money(byPay.card)} />
        <Stat k="Productos vendidos" v={String(products)} />
        <Stat k="Tickets pagados" v={String(paidTickets)} />
        <Stat k="Pulseras vendidas" v={String(wristbandsSold)} />
        <Stat k="Consumos staff" v={String(consQty)} />
        <Stat k="Tickets cortesía" v={String(compQty)} />
        <Stat k="Total personas ingresadas" v={String(peoplePaid + peopleComp)} big />
      </div>

      <div>
        <h3 className="mb-3 text-lg font-bold uppercase tracking-widest">Puestos Activos ({data.shifts.length})</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <Panel title={`Barras activas (${barShifts.length})`}>
            {barShifts.length === 0 && <p className="text-sm text-muted-foreground">Sin barras activas.</p>}
            {barShifts.map((s: any) => <ShiftRow key={s.id} s={s} sales={liveSales} kindLabel="BARRA" onRelease={() => forceRelease(s.id, s.bars?.name)} />)}
          </Panel>
          <Panel title={`Entradas activas (${entryShifts.length})`}>
            {entryShifts.length === 0 && <p className="text-sm text-muted-foreground">Sin entradas activas.</p>}
            {entryShifts.map((s: any) => <ShiftRow key={s.id} s={s} sales={liveSales} kindLabel="ENTRADA" onRelease={() => forceRelease(s.id, s.entries?.name)} />)}
          </Panel>
        </div>
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
function ShiftRow({ s, sales, kindLabel, onRelease }: { s: any; sales: any[]; kindLabel: string; onRelease: () => void }) {
  const mine = sales.filter((x: any) => x.shift_id === s.id);
  const total = mine.reduce((sum, x) => sum + Number(x.total), 0);
  const place = s.bars?.name || s.entries?.name;
  return (
    <div className="flex items-center justify-between rounded-lg border border-border p-3">
      <div className="min-w-0 flex-1">
        <div className="font-bold">{kindLabel} · {place} · {s.profiles?.username}</div>
        <div className="text-xs text-muted-foreground">Inicio {dt(s.opened_at)}</div>
      </div>
      <div className="text-right">
        <div className="text-lg font-black">{money(total)}</div>
        <div className="text-xs text-muted-foreground">{mine.length} ventas</div>
      </div>
      <button onClick={onRelease}
        className="ml-3 rounded-md border border-destructive px-3 py-2 text-xs font-bold uppercase tracking-widest text-destructive hover:bg-destructive hover:text-destructive-foreground">
        Liberar
      </button>
    </div>
  );
}
