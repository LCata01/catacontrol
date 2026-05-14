import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Guard } from "@/components/Guard";
import { TopBar } from "@/components/TopBar";
import { ShiftOpener } from "@/components/ShiftOpener";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getActiveEvent, getOpenShift } from "@/lib/queries";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { money } from "@/lib/format";
import { CloseShiftDialog } from "@/components/CloseShiftDialog";
import { ComplimentaryDialog } from "@/components/ComplimentaryDialog";

export const Route = createFileRoute("/entry")({
  component: () => <Guard requireRole="cashier" requireLock="entry"><EntryPos /></Guard>,
});

type CartItem = {
  kind: "ticket" | "wristband";
  ref_id: string;
  name: string; price: number; qty: number;
};

function EntryPos() {
  const { userId, lock, setLock } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: event } = useQuery({ queryKey: ["active-event"], queryFn: getActiveEvent });
  const { data: shift, isLoading, refetch } = useQuery({
    queryKey: ["my-shift", userId], enabled: !!userId,
    queryFn: () => getOpenShift(userId!),
  });
  const { data: tickets } = useQuery({
    queryKey: ["tickets-paid"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ticket_types")
        .select("*").eq("active", true).eq("is_complimentary", false).order("name");
      if (error) throw error; return data!;
    },
  });
  const { data: wristbands } = useQuery({
    queryKey: ["wristbands-active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("wristbands").select("*").eq("active", true).order("name");
      if (error) throw error; return data!;
    },
  });
  const [cart, setCart] = useState<CartItem[]>([]);
  const [pay, setPay] = useState<"cash" | "qr" | "card">("cash");
  const [busy, setBusy] = useState(false);
  const [openComp, setOpenComp] = useState(false);
  const [openClose, setOpenClose] = useState(false);

  const total = useMemo(() => cart.reduce((s, i) => s + i.price * i.qty, 0), [cart]);

  const add = (kind: "ticket" | "wristband", item: any) => {
    setCart((c) => {
      const ix = c.findIndex((i) => i.kind === kind && i.ref_id === item.id);
      if (ix >= 0) { const n = [...c]; n[ix] = { ...n[ix], qty: n[ix].qty + 1 }; return n; }
      return [...c, { kind, ref_id: item.id, name: item.name, price: Number(item.price), qty: 1 }];
    });
  };
  const inc = (kind: string, id: string, d: number) =>
    setCart((c) => c.map((i) => i.kind === kind && i.ref_id === id ? { ...i, qty: Math.max(0, i.qty + d) } : i).filter((i) => i.qty > 0));

  const openShift = async (initial: number) => {
    if (!userId || !lock) return;
    setBusy(true);
    const { data, error } = await supabase.from("shifts").insert({
      user_id: userId, kind: "entry", entry_id: lock.id,
      event_id: event?.id ?? null, initial_cash: initial,
    }).select().single();
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setLock({ ...lock, shiftId: data.id });
    refetch();
    toast.success("Shift opened");
  };

  const charge = async () => {
    if (!shift || cart.length === 0 || !userId) return;
    setBusy(true);
    const { data: sale, error } = await supabase.from("sales").insert({
      shift_id: shift.id, user_id: userId, event_id: event?.id ?? null,
      entry_id: lock!.id, payment_method: pay, total,
    }).select().single();
    if (error || !sale) { setBusy(false); toast.error(error?.message ?? "Error"); return; }
    const items = cart.map((i) => ({
      sale_id: sale.id, item_kind: i.kind,
      ticket_type_id: i.kind === "ticket" ? i.ref_id : null,
      wristband_id: i.kind === "wristband" ? i.ref_id : null,
      name: i.name, unit_price: i.price, quantity: i.qty, subtotal: i.price * i.qty,
    }));
    const { error: e2 } = await supabase.from("sale_items").insert(items);
    setBusy(false);
    if (e2) { toast.error(e2.message); return; }
    toast.success(`Sale #${sale.sale_number} saved`);
    setCart([]);
  };

  if (isLoading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>;

  if (!shift) {
    return (
      <div className="min-h-screen">
        <TopBar title={`ENTRY · ${lock?.name}`} right={
          <button onClick={() => { setLock(null); navigate({ to: "/workstation" }); }}
            className="rounded-md border border-border px-3 py-2 text-sm hover:bg-accent">Change</button>
        } />
        <ShiftOpener title={`Open shift — ${lock?.name}`} onOpen={openShift} busy={busy} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar title={`ENTRY · ${lock?.name}`}
        right={
          <div className="flex gap-2">
            <button onClick={() => setOpenComp(true)}
              className="rounded-md border border-warning bg-card px-3 py-2 text-xs font-bold uppercase tracking-widest text-warning hover:bg-warning hover:text-warning-foreground">Free entry</button>
            <button onClick={() => setOpenClose(true)}
              className="rounded-md border border-destructive bg-card px-3 py-2 text-xs font-bold uppercase tracking-widest text-destructive hover:bg-destructive hover:text-destructive-foreground">Close shift</button>
          </div>
        } />

      <div className="grid flex-1 gap-4 p-4 lg:grid-cols-[1fr_420px]">
        <div className="flex flex-col gap-4">
          <Section title="Tickets">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {tickets?.map((t: any) => (
                <button key={t.id} onClick={() => add("ticket", t)}
                  className="rounded-xl border border-border bg-card p-4 text-left hover:border-primary">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">Ticket</div>
                  <div className="mt-1 text-base font-bold">{t.name}</div>
                  <div className="mt-2 text-xl font-black">{money(t.price)}</div>
                </button>
              ))}
            </div>
          </Section>
          <Section title="Wristbands">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {wristbands?.map((w: any) => (
                <button key={w.id} onClick={() => add("wristband", w)}
                  className="rounded-xl border border-border bg-card p-4 text-left hover:border-primary">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">Wristband</div>
                  <div className="mt-1 text-base font-bold">{w.name}</div>
                  <div className="mt-2 text-xl font-black">{money(w.price)}</div>
                </button>
              ))}
            </div>
          </Section>
        </div>

        <div className="flex flex-col rounded-2xl border border-border bg-card">
          <div className="flex-1 overflow-auto p-4">
            {cart.length === 0 && <p className="text-center text-sm text-muted-foreground">Tap items to add</p>}
            {cart.map((i) => (
              <div key={i.kind + i.ref_id} className="mb-2 flex items-center gap-2 rounded-lg border border-border p-2">
                <div className="flex-1">
                  <div className="font-bold leading-tight">{i.name}</div>
                  <div className="text-xs text-muted-foreground">{i.kind} · {money(i.price)}</div>
                </div>
                <button onClick={() => inc(i.kind, i.ref_id, -1)} className="h-10 w-10 rounded-md border border-border text-xl">−</button>
                <div className="w-8 text-center font-bold">{i.qty}</div>
                <button onClick={() => inc(i.kind, i.ref_id, +1)} className="h-10 w-10 rounded-md border border-border text-xl">+</button>
                <div className="w-20 text-right font-bold">{money(i.price * i.qty)}</div>
              </div>
            ))}
          </div>
          <div className="border-t border-border p-4">
            <div className="mb-3 flex gap-2">
              {(["cash", "qr", "card"] as const).map((m) => (
                <button key={m} onClick={() => setPay(m)}
                  className={`flex-1 rounded-lg border px-3 py-3 text-sm font-bold uppercase tracking-widest ${pay === m ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"}`}>
                  {m}
                </button>
              ))}
            </div>
            <div className="mb-3 flex items-baseline justify-between">
              <span className="text-xs uppercase tracking-widest text-muted-foreground">Total</span>
              <span className="text-4xl font-black">{money(total)}</span>
            </div>
            <button disabled={busy || cart.length === 0} onClick={charge}
              className="w-full rounded-lg bg-success py-5 text-lg font-bold uppercase tracking-widest text-success-foreground disabled:opacity-50">
              Charge
            </button>
          </div>
        </div>
      </div>

      {openComp && shift && (
        <ComplimentaryDialog shiftId={shift.id} entryId={lock!.id} eventId={event?.id ?? null}
          onClose={() => setOpenComp(false)} />
      )}
      {openClose && shift && (
        <CloseShiftDialog shift={shift} kind="entry" onClose={() => setOpenClose(false)}
          onClosed={() => { setLock(null); navigate({ to: "/workstation" }); }} />
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 text-xs uppercase tracking-widest text-muted-foreground">{title}</div>
      {children}
    </div>
  );
}
