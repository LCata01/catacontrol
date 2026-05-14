import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { money, dt } from "@/lib/format";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/reports")({ component: Reports });

function Reports() {
  const [tab, setTab] = useState<"sales" | "consumptions" | "comps" | "shifts">("sales");
  const tabs = [
    { id: "sales", label: "Ventas" },
    { id: "consumptions", label: "Consumos staff" },
    { id: "comps", label: "Cortesías" },
    { id: "shifts", label: "Cierres de turno" },
  ] as const;

  return (
    <div>
      <h2 className="mb-4 text-2xl font-black uppercase">Reportes</h2>
      <div className="mb-4 flex gap-2">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`rounded-md px-4 py-2 text-sm font-bold uppercase tracking-widest ${tab === t.id ? "bg-primary text-primary-foreground" : "border border-border"}`}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === "sales" && <SalesReport />}
      {tab === "consumptions" && <ConsReport />}
      {tab === "comps" && <CompsReport />}
      {tab === "shifts" && <ShiftReport />}
    </div>
  );
}

function exportCsv(rows: any[], filename: string) {
  if (rows.length === 0) return;
  const cols = Object.keys(rows[0]);
  const csv = [cols.join(","), ...rows.map(r => cols.map(c => JSON.stringify(r[c] ?? "")).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// Lookup helpers (no PostgREST embeds — those joins via auth.users break the query)
async function loadLookups() {
  const [{ data: profiles }, { data: bars }, { data: entries }, { data: events }] = await Promise.all([
    supabase.from("profiles").select("id, username"),
    supabase.from("bars").select("id, name"),
    supabase.from("entries").select("id, name"),
    supabase.from("events").select("id, name"),
  ]);
  const map = (arr: any[] | null, key = "id") =>
    Object.fromEntries((arr ?? []).map((r) => [r[key], r]));
  return {
    profiles: map(profiles),
    bars: map(bars),
    entries: map(entries),
    events: map(events),
  };
}

function useLookups() {
  return useQuery({ queryKey: ["report-lookups"], queryFn: loadLookups, staleTime: 60_000 });
}

function SalesReport() {
  const lookups = useLookups();
  const { data, isLoading, error } = useQuery({
    queryKey: ["report-sales"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sales")
        .select("sale_number, created_at, total, payment_method, cancelled, user_id, bar_id, entry_id, event_id")
        .order("created_at", { ascending: false }).limit(500);
      if (error) { toast.error(error.message); throw error; }
      return data!;
    },
  });
  if (isLoading || lookups.isLoading) return <Loading />;
  if (error) return <ErrorBox e={error} />;
  const L = lookups.data!;
  const rows = (data ?? []).map((s: any) => ({
    number: s.sale_number, date: s.created_at,
    user: L.profiles[s.user_id]?.username,
    location: L.bars[s.bar_id]?.name || L.entries[s.entry_id]?.name,
    event: L.events[s.event_id]?.name,
    payment: s.payment_method, total: s.total, cancelled: s.cancelled,
  }));
  return (
    <div>
      <ExportBtn rows={rows} name="ventas.csv" />
      <Table cols={["#", "Fecha", "Usuario", "Lugar", "Evento", "Pago", "Total"]} rows={rows.map(r => [r.number, dt(r.date), r.user, r.location, r.event, r.payment, money(r.total)])} />
    </div>
  );
}

function ConsReport() {
  const lookups = useLookups();
  const { data, isLoading, error } = useQuery({
    queryKey: ["report-cons"],
    queryFn: async () => {
      const { data, error } = await supabase.from("staff_consumptions")
        .select("created_at, staff_name, staff_category, product_name, quantity, user_id, bar_id")
        .order("created_at", { ascending: false }).limit(500);
      if (error) { toast.error(error.message); throw error; }
      return data!;
    },
  });
  if (isLoading || lookups.isLoading) return <Loading />;
  if (error) return <ErrorBox e={error} />;
  const L = lookups.data!;
  const rows = (data ?? []).map((c: any) => ({
    date: c.created_at, staff: c.staff_name, category: c.staff_category, product: c.product_name,
    qty: c.quantity, bar: L.bars[c.bar_id]?.name, cashier: L.profiles[c.user_id]?.username,
  }));
  return (
    <div>
      <ExportBtn rows={rows} name="consumos_staff.csv" />
      <Table cols={["Fecha", "Staff", "Categoría", "Producto", "Cant.", "Barra", "Cajero"]}
        rows={rows.map(r => [dt(r.date), r.staff, r.category, r.product, r.qty, r.bar, r.cashier])} />
    </div>
  );
}

function CompsReport() {
  const lookups = useLookups();
  const { data, isLoading, error } = useQuery({
    queryKey: ["report-comps"],
    queryFn: async () => {
      const { data, error } = await supabase.from("complimentary_tickets")
        .select("created_at, guest_name, ticket_category, quantity, notes, user_id, entry_id")
        .order("created_at", { ascending: false }).limit(500);
      if (error) { toast.error(error.message); throw error; }
      return data!;
    },
  });
  if (isLoading || lookups.isLoading) return <Loading />;
  if (error) return <ErrorBox e={error} />;
  const L = lookups.data!;
  const rows = (data ?? []).map((c: any) => ({
    date: c.created_at, guest: c.guest_name, category: c.ticket_category, qty: c.quantity,
    notes: c.notes, entry: L.entries[c.entry_id]?.name, cashier: L.profiles[c.user_id]?.username,
  }));
  return (
    <div>
      <ExportBtn rows={rows} name="cortesias.csv" />
      <Table cols={["Fecha", "Invitado", "Categoría", "Cant.", "Notas", "Entrada", "Cajero"]}
        rows={rows.map(r => [dt(r.date), r.guest, r.category, r.qty, r.notes, r.entry, r.cashier])} />
    </div>
  );
}

function ShiftReport() {
  const lookups = useLookups();
  const { data, isLoading, error } = useQuery({
    queryKey: ["report-shifts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("shifts")
        .select("opened_at, closed_at, kind, initial_cash, actual_cash, status, user_id, bar_id, entry_id")
        .order("opened_at", { ascending: false }).limit(500);
      if (error) { toast.error(error.message); throw error; }
      return data!;
    },
  });
  if (isLoading || lookups.isLoading) return <Loading />;
  if (error) return <ErrorBox e={error} />;
  const L = lookups.data!;
  const rows = (data ?? []).map((s: any) => ({
    open: s.opened_at, close: s.closed_at, kind: s.kind === "bar" ? "Barra" : "Entrada",
    location: L.bars[s.bar_id]?.name || L.entries[s.entry_id]?.name,
    user: L.profiles[s.user_id]?.username,
    initial: s.initial_cash, actual: s.actual_cash,
    status: s.status === "open" ? "Abierto" : "Cerrado",
  }));
  return (
    <div>
      <ExportBtn rows={rows} name="turnos.csv" />
      <Table cols={["Apertura", "Cierre", "Tipo", "Lugar", "Usuario", "Inicial", "Real", "Estado"]}
        rows={rows.map(r => [dt(r.open), dt(r.close), r.kind, r.location, r.user, money(r.initial), r.actual !== null ? money(r.actual) : "—", r.status])} />
    </div>
  );
}

function ExportBtn({ rows, name }: { rows: any[]; name: string }) {
  return (
    <button onClick={() => exportCsv(rows, name)} className="mb-3 rounded-md border border-border px-4 py-2 text-sm">
      Exportar CSV
    </button>
  );
}
function Loading() { return <div className="p-6 text-center text-muted-foreground">Cargando…</div>; }
function ErrorBox({ e }: { e: any }) { return <div className="rounded-md border border-destructive p-4 text-sm text-destructive">Error: {e?.message ?? String(e)}</div>; }

function Table({ cols, rows }: { cols: string[]; rows: any[][] }) {
  return (
    <div className="overflow-auto rounded-xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted text-left text-xs uppercase tracking-widest text-muted-foreground">
          <tr>{cols.map(c => <th key={c} className="px-4 py-3">{c}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={cols.length} className="p-6 text-center text-muted-foreground">Sin datos</td></tr>}
          {rows.map((r, i) => <tr key={i} className="border-t border-border">{r.map((c, j) => <td key={j} className="px-4 py-3">{c ?? "—"}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  );
}
