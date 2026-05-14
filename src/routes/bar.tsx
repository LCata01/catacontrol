import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Guard } from "@/components/Guard";
import { TopBar } from "@/components/TopBar";
import { ShiftOpener } from "@/components/ShiftOpener";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getActiveEvent, getOpenShift } from "@/lib/queries";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { money } from "@/lib/format";
import { printBarTicket } from "@/lib/printer";
import { PrinterSettingsButton } from "@/components/PrinterSettings";
import { StaffConsumptionDialog } from "@/components/StaffConsumptionDialog";
import { CloseShiftDialog } from "@/components/CloseShiftDialog";

export const Route = createFileRoute("/bar")({
  component: () => <Guard requireRole="cashier" requireLock="bar"><BarPos /></Guard>,
});

type CartItem = { product_id: string; name: string; price: number; qty: number };

function BarPos() {
  const { userId, lock, setLock, username } = useAuth();
  const navigate = useNavigate();

  const { data: event } = useQuery({ queryKey: ["active-event"], queryFn: getActiveEvent });
  const { data: shift, isLoading: shiftLoading, refetch: refetchShift } = useQuery({
    queryKey: ["my-shift", userId], enabled: !!userId,
    queryFn: () => getOpenShift(userId!),
  });
  const { data: products } = useQuery({
    queryKey: ["products-active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").eq("active", true).order("name");
      if (error) throw error; return data!;
    },
  });
  const { data: branding } = useQuery({
    queryKey: ["app-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("app_settings").select("*").maybeSingle();
      return data ?? { nightclub_name: "CATA CLUB", slogan: "", logo_url: null };
    },
  });

  const [cart, setCart] = useState<CartItem[]>([]);
  const [pay, setPay] = useState<"cash" | "qr" | "card">("cash");
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState(false);
  const [openStaff, setOpenStaff] = useState(false);
  const [openClose, setOpenClose] = useState(false);

  const total = useMemo(() => cart.reduce((s, i) => s + i.price * i.qty, 0), [cart]);
  const filtered = useMemo(
    () => (products ?? []).filter((p: any) => p.name.toLowerCase().includes(filter.toLowerCase())),
    [products, filter]
  );

  useEffect(() => {
    if (shift && lock && shift.bar_id !== lock.id) {
      toast.error("El turno abierto pertenece a otra barra. Ciérrelo primero.");
    }
  }, [shift, lock]);

  const openShift = async (initial: number) => {
    if (!userId || !lock) return;
    setBusy(true);
    const { data, error } = await supabase.from("shifts").insert({
      user_id: userId, kind: "bar", bar_id: lock.id,
      event_id: event?.id ?? null, initial_cash: initial,
    }).select().single();
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setLock({ ...lock, shiftId: data.id });
    refetchShift();
    toast.success("Turno abierto");
  };

  const add = (p: any) => {
    setCart((c) => {
      const ix = c.findIndex((i) => i.product_id === p.id);
      if (ix >= 0) {
        const n = [...c]; n[ix] = { ...n[ix], qty: n[ix].qty + 1 }; return n;
      }
      return [...c, { product_id: p.id, name: p.name, price: Number(p.price), qty: 1 }];
    });
  };
  const inc = (id: string, d: number) =>
    setCart((c) => c.map((i) => i.product_id === id ? { ...i, qty: Math.max(0, i.qty + d) } : i).filter((i) => i.qty > 0));
  const removeItem = (id: string) => setCart((c) => c.filter((i) => i.product_id !== id));

  const charge = async () => {
    if (!shift || cart.length === 0 || !userId) return;
    setBusy(true);
    const { data: sale, error } = await supabase.from("sales").insert({
      shift_id: shift.id, user_id: userId, event_id: event?.id ?? null,
      bar_id: lock!.id, payment_method: pay, total,
    }).select().single();
    if (error || !sale) { setBusy(false); toast.error(error?.message ?? "Error"); return; }
    const items = cart.map((i) => ({
      sale_id: sale.id, item_kind: "product", product_id: i.product_id,
      name: i.name, unit_price: i.price, quantity: i.qty, subtotal: i.price * i.qty,
      people_count: 0,
    }));
    const { error: e2 } = await supabase.from("sale_items").insert(items);
    setBusy(false);
    if (e2) { toast.error(e2.message); return; }
    toast.success(`Venta #${sale.sale_number} · ${money(total)}`);
    printBarTicket({
      branding: branding ?? {},
      number: sale.sale_number,
      bar: lock?.name ?? "—",
      cashier: username ?? "—",
      event: event?.name,
      lines: cart.map((i) => ({ qty: i.qty, name: i.name, unit: i.price, subtotal: i.price * i.qty })),
      total, payment: pay,
    });
    setCart([]);
  };

  if (shiftLoading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Cargando…</div>;

  if (!shift) {
    return (
      <div className="min-h-screen">
        <TopBar title={`BARRA · ${lock?.name}`} right={
          <button onClick={() => { setLock(null); navigate({ to: "/workstation" }); }}
            className="rounded-md border border-border px-3 py-2 text-sm hover:bg-accent">Cambiar</button>
        } />
        <ShiftOpener title={`Abrir turno — ${lock?.name}`} onOpen={openShift} busy={busy} />
      </div>
    );
  }

  const payLabels: Record<string, string> = { cash: "EFECTIVO", qr: "QR", card: "TARJETA" };

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar title={`BARRA · ${lock?.name}`}
        right={
          <div className="flex gap-2">
            <PrinterSettingsButton />
            <button onClick={() => setOpenStaff(true)}
              className="rounded-md border border-warning bg-card px-3 py-2 text-xs font-bold uppercase tracking-widest text-warning hover:bg-warning hover:text-warning-foreground">Staff</button>
            <button onClick={() => setOpenClose(true)}
              className="rounded-md border border-destructive bg-card px-3 py-2 text-xs font-bold uppercase tracking-widest text-destructive hover:bg-destructive hover:text-destructive-foreground">Cerrar Turno</button>
          </div>
        } />

      <div className="grid flex-1 gap-4 p-4 lg:grid-cols-[1fr_420px]">
        <div className="flex flex-col rounded-2xl border border-border bg-card p-4">
          <input
            value={filter} onChange={(e) => setFilter(e.target.value)}
            placeholder="Buscar producto…"
            className="mb-4 w-full rounded-lg border border-border bg-input px-4 py-3 outline-none focus:ring-2 ring-ring"
          />
          <div className="grid flex-1 grid-cols-3 gap-2 overflow-auto sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 auto-rows-min content-start">
            {filtered.map((p: any) => (
              <button key={p.id} onClick={() => add(p)}
                className="flex flex-col rounded-lg border border-border bg-background p-2 text-left hover:border-primary">
                <div className="text-[9px] uppercase tracking-wider text-muted-foreground truncate">{p.category}</div>
                <div className="mt-0.5 text-sm font-bold leading-tight line-clamp-2">{p.name}</div>
                <div className="mt-1 text-base font-black">{money(p.price)}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col rounded-2xl border border-border bg-card">
          <div className="flex-1 overflow-auto p-4">
            {cart.length === 0 && <p className="text-center text-sm text-muted-foreground">Toque productos para agregar</p>}
            {cart.map((i) => (
              <div key={i.product_id} className="mb-2 flex items-center gap-2 rounded-lg border border-border p-2">
                <div className="flex-1">
                  <div className="font-bold leading-tight">{i.name}</div>
                  <div className="text-xs text-muted-foreground">{money(i.price)} c/u</div>
                </div>
                <button onClick={() => inc(i.product_id, -1)} className="h-10 w-10 rounded-md border border-border text-xl">−</button>
                <div className="w-8 text-center font-bold">{i.qty}</div>
                <button onClick={() => inc(i.product_id, +1)} className="h-10 w-10 rounded-md border border-border text-xl">+</button>
                <div className="w-20 text-right font-bold">{money(i.price * i.qty)}</div>
                <button onClick={() => removeItem(i.product_id)} className="text-destructive">×</button>
              </div>
            ))}
          </div>
          <div className="border-t border-border p-4">
            <div className="mb-3 flex gap-2">
              {(["cash", "qr", "card"] as const).map((m) => (
                <button key={m} onClick={() => setPay(m)}
                  className={`flex-1 rounded-lg border px-3 py-3 text-sm font-bold uppercase tracking-widest ${pay === m ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"}`}>
                  {payLabels[m]}
                </button>
              ))}
            </div>
            <div className="mb-3 flex items-baseline justify-between">
              <span className="text-xs uppercase tracking-widest text-muted-foreground">Total</span>
              <span className="text-4xl font-black">{money(total)}</span>
            </div>
            <button disabled={busy || cart.length === 0} onClick={charge}
              className="w-full rounded-lg bg-success py-5 text-lg font-bold uppercase tracking-widest text-success-foreground disabled:opacity-50">
              Cobrar
            </button>
          </div>
        </div>
      </div>

      {openStaff && shift && (
        <StaffConsumptionDialog
          shiftId={shift.id} barId={lock!.id} eventId={event?.id ?? null}
          onClose={() => setOpenStaff(false)} />
      )}
      {openClose && shift && (
        <CloseShiftDialog
          shift={shift} kind="bar" onClose={() => setOpenClose(false)}
          onClosed={() => { setLock(null); navigate({ to: "/workstation" }); }} />
      )}
    </div>
  );
}
