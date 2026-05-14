import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { printStaffTicket, type TicketBranding } from "@/lib/printer";

// Categorías cargadas dinámicamente desde la tabla staff_categories

export function StaffConsumptionDialog({
  shiftId, barId, eventId, eventName, branding, onClose,
}: {
  shiftId: string;
  barId: string;
  eventId: string | null;
  eventName?: string;
  branding?: TicketBranding;
  onClose: () => void;
}) {
  const { userId } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [category, setCategory] = useState<string | null>(null);
  const [staffId, setStaffId] = useState<string>("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);

  const { data: staffList } = useQuery({
    queryKey: ["staff-by-cat", category],
    enabled: !!category,
    queryFn: async () => {
      const { data, error } = await supabase.from("staff_members")
        .select("*").eq("active", true).eq("category", category as any).order("full_name");
      if (error) throw error; return data!;
    },
  });

  const { data: products } = useQuery({
    queryKey: ["products-active-staff"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").eq("active", true).order("name");
      if (error) throw error; return data!;
    },
  });

  const staff = useMemo(() => staffList?.find((s: any) => s.id === staffId), [staffList, staffId]);
  const totalQty = useMemo(() => Object.values(cart).reduce((a, b) => a + b, 0), [cart]);

  const setQty = (id: string, d: number) =>
    setCart((c) => {
      const next = { ...c, [id]: Math.max(0, (c[id] ?? 0) + d) };
      if (next[id] === 0) delete next[id];
      return next;
    });

  const confirm = async () => {
    if (!staff || !userId || totalQty === 0) return;
    setBusy(true);
    const rows = Object.entries(cart).map(([pid, qty]) => {
      const p = products!.find((x: any) => x.id === pid)!;
      return {
        shift_id: shiftId, user_id: userId, bar_id: barId, event_id: eventId,
        staff_member_id: staff.id, staff_name: staff.full_name, staff_category: staff.category,
        product_id: p.id, product_name: p.name, quantity: qty,
      };
    });
    const { error } = await supabase.from("staff_consumptions").insert(rows);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Consumo de staff registrado");

    const items = Object.entries(cart).map(([pid, qty]) => ({
      name: products!.find((x: any) => x.id === pid)!.name,
      qty,
    }));
    printStaffTicket({
      branding: branding ?? {},
      event: eventName,
      staffName: staff.full_name,
      staffCategory: CATEGORIES.find((c) => c.value === staff.category)?.label ?? staff.category,
      items,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-bold">CONSUMO STAFF · Paso {step}/3</h3>
          <button onClick={onClose} className="text-2xl text-muted-foreground">×</button>
        </div>

        {step === 1 && (
          <div>
            <p className="mb-3 text-sm text-muted-foreground">SELECCIONAR CATEGORÍA DE STAFF</p>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((c) => (
                <button key={c.value}
                  onClick={() => { setCategory(c.value); setStaffId(""); setStep(2); }}
                  className="rounded-lg border border-border bg-background p-4 text-center font-bold uppercase tracking-widest hover:border-primary">
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <p className="mb-3 text-sm">Categoría: <b>{CATEGORIES.find(c => c.value === category)?.label}</b></p>
            <label className="mb-1 block text-xs uppercase tracking-widest text-muted-foreground">Seleccionar persona</label>
            <select value={staffId} onChange={(e) => setStaffId(e.target.value)}
              className="mb-4 w-full rounded-lg border border-border bg-input px-4 py-3 outline-none focus:ring-2 ring-ring">
              <option value="">— elegir —</option>
              {staffList?.map((s: any) => (
                <option key={s.id} value={s.id}>{s.full_name}</option>
              ))}
            </select>
            {staffList && staffList.length === 0 && (
              <div className="rounded-lg border border-destructive p-3 text-center text-destructive">
                No hay personal registrado en esta categoría
              </div>
            )}
            <div className="flex justify-between">
              <button onClick={() => setStep(1)} className="text-sm text-muted-foreground">← volver</button>
              <button disabled={!staffId} onClick={() => setStep(3)}
                className="rounded-lg bg-primary px-6 py-2 font-bold uppercase tracking-widest text-primary-foreground disabled:opacity-50">
                Siguiente
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <div className="mb-2 text-sm">Persona: <b>{staff?.full_name}</b></div>
            <label className="mb-1 block text-xs uppercase tracking-widest text-muted-foreground">
              Seleccionar productos (GRATIS) — tocá para agregar
            </label>
            <div className="mb-3 grid max-h-64 grid-cols-2 gap-2 overflow-auto">
              {products?.map((p: any) => {
                const q = cart[p.id] ?? 0;
                return (
                  <div key={p.id}
                    className={`rounded-lg border p-3 ${q > 0 ? "border-primary" : "border-border"}`}>
                    <div className="text-xs uppercase text-muted-foreground">{p.category}</div>
                    <div className="font-bold">{p.name}</div>
                    <div className="mt-2 flex items-center justify-between">
                      <button onClick={() => setQty(p.id, -1)}
                        className="h-8 w-8 rounded border border-border text-lg">−</button>
                      <div className="w-8 text-center font-black">{q}</div>
                      <button onClick={() => setQty(p.id, +1)}
                        className="h-8 w-8 rounded border border-border text-lg">+</button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mb-3 text-center text-sm text-muted-foreground">
              Total productos: <b className="text-foreground">{totalQty}</b>
            </div>
            <button disabled={busy || totalQty === 0} onClick={confirm}
              className="w-full rounded-lg bg-primary py-4 font-bold uppercase tracking-widest text-primary-foreground disabled:opacity-50">
              Confirmar e imprimir
            </button>
            <button onClick={() => setStep(2)} className="mt-3 w-full text-center text-sm text-muted-foreground">← volver</button>
          </div>
        )}
      </div>
    </div>
  );
}
