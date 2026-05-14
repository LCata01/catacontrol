import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { money, dt } from "@/lib/format";
import { useState } from "react";

export const Route = createFileRoute("/admin/reports")({ component: Reports });

function Reports() {
  const [tab, setTab] = useState<"sales" | "consumptions" | "comps" | "shifts">("sales");
  const tabs = [
    { id: "sales", label: "Sales" },
    { id: "consumptions", label: "Staff consumptions" },
    { id: "comps", label: "Complimentary" },
    { id: "shifts", label: "Closings" },
  ] as const;

  return (
    <div>
      <h2 className="mb-4 text-2xl font-black uppercase">Reports</h2>
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

function SalesReport() {
  const { data } = useQuery({
    queryKey: ["report-sales"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sales")
        .select("sale_number, created_at, total, payment_method, cancelled, bars(name), entries(name), profiles!sales_user_id_fkey(username), events(name)")
        .order("created_at", { ascending: false }).limit(500);
      if (error) throw error; return data!;
    },
  });
  const rows = (data ?? []).map((s: any) => ({
    number: s.sale_number, date: s.created_at, user: s.profiles?.username,
    location: s.bars?.name || s.entries?.name, event: s.events?.name,
    payment: s.payment_method, total: s.total, cancelled: s.cancelled,
  }));
  return (
    <div>
      <button onClick={() => exportCsv(rows, "sales.csv")} className="mb-3 rounded-md border border-border px-4 py-2 text-sm">Export CSV</button>
      <Table cols={["#", "Date", "User", "Location", "Event", "Payment", "Total"]} rows={rows.map(r => [r.number, dt(r.date), r.user, r.location, r.event, r.payment, money(r.total)])} />
    </div>
  );
}
function ConsReport() {
  const { data } = useQuery({
    queryKey: ["report-cons"],
    queryFn: async () => {
      const { data, error } = await supabase.from("staff_consumptions")
        .select("created_at, staff_name, staff_category, product_name, quantity, bars(name), profiles!staff_consumptions_user_id_fkey(username)")
        .order("created_at", { ascending: false }).limit(500);
      if (error) throw error; return data!;
    },
  });
  const rows = (data ?? []).map((c: any) => ({
    date: c.created_at, staff: c.staff_name, category: c.staff_category, product: c.product_name,
    qty: c.quantity, bar: c.bars?.name, cashier: c.profiles?.username,
  }));
  return (
    <div>
      <button onClick={() => exportCsv(rows, "staff_consumptions.csv")} className="mb-3 rounded-md border border-border px-4 py-2 text-sm">Export CSV</button>
      <Table cols={["Date", "Staff", "Category", "Product", "Qty", "Bar", "Cashier"]}
        rows={rows.map(r => [dt(r.date), r.staff, r.category, r.product, r.qty, r.bar, r.cashier])} />
    </div>
  );
}
function CompsReport() {
  const { data } = useQuery({
    queryKey: ["report-comps"],
    queryFn: async () => {
      const { data, error } = await supabase.from("complimentary_tickets")
        .select("created_at, guest_name, ticket_category, quantity, notes, entries(name), profiles!complimentary_tickets_user_id_fkey(username)")
        .order("created_at", { ascending: false }).limit(500);
      if (error) throw error; return data!;
    },
  });
  const rows = (data ?? []).map((c: any) => ({
    date: c.created_at, guest: c.guest_name, category: c.ticket_category, qty: c.quantity,
    notes: c.notes, entry: c.entries?.name, cashier: c.profiles?.username,
  }));
  return (
    <div>
      <button onClick={() => exportCsv(rows, "complimentary.csv")} className="mb-3 rounded-md border border-border px-4 py-2 text-sm">Export CSV</button>
      <Table cols={["Date", "Guest", "Category", "Qty", "Notes", "Entry", "Cashier"]}
        rows={rows.map(r => [dt(r.date), r.guest, r.category, r.qty, r.notes, r.entry, r.cashier])} />
    </div>
  );
}
function ShiftReport() {
  const { data } = useQuery({
    queryKey: ["report-shifts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("shifts")
        .select("opened_at, closed_at, kind, initial_cash, actual_cash, status, bars(name), entries(name), profiles!shifts_user_id_fkey(username)")
        .order("opened_at", { ascending: false }).limit(500);
      if (error) throw error; return data!;
    },
  });
  const rows = (data ?? []).map((s: any) => ({
    open: s.opened_at, close: s.closed_at, kind: s.kind,
    location: s.bars?.name || s.entries?.name, user: s.profiles?.username,
    initial: s.initial_cash, actual: s.actual_cash, status: s.status,
  }));
  return (
    <div>
      <button onClick={() => exportCsv(rows, "shifts.csv")} className="mb-3 rounded-md border border-border px-4 py-2 text-sm">Export CSV</button>
      <Table cols={["Opened", "Closed", "Kind", "Location", "User", "Initial", "Actual", "Status"]}
        rows={rows.map(r => [dt(r.open), dt(r.close), r.kind, r.location, r.user, money(r.initial), r.actual !== null ? money(r.actual) : "—", r.status])} />
    </div>
  );
}
function Table({ cols, rows }: { cols: string[]; rows: any[][] }) {
  return (
    <div className="overflow-auto rounded-xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted text-left text-xs uppercase tracking-widest text-muted-foreground">
          <tr>{cols.map(c => <th key={c} className="px-4 py-3">{c}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={cols.length} className="p-6 text-center text-muted-foreground">No data</td></tr>}
          {rows.map((r, i) => <tr key={i} className="border-t border-border">{r.map((c, j) => <td key={j} className="px-4 py-3">{c ?? "—"}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  );
}
