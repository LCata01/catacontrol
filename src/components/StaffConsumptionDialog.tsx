import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { printTicket } from "@/lib/printer";

export function StaffConsumptionDialog({
  shiftId, barId, eventId, onClose,
}: {
  shiftId: string; barId: string; eventId: string | null; onClose: () => void;
}) {
  const { userId } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [search, setSearch] = useState("");
  const [staff, setStaff] = useState<any | null>(null);
  const [productId, setProductId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);

  const { data: matches } = useQuery({
    queryKey: ["staff-search", search],
    enabled: step === 1 && search.length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase.from("staff_members")
        .select("*").eq("active", true)
        .ilike("full_name", `%${search}%`).limit(10);
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

  const product = products?.find((p: any) => p.id === productId);

  const confirm = async () => {
    if (!staff || !product || !userId) return;
    setBusy(true);
    const { error } = await supabase.from("staff_consumptions").insert({
      shift_id: shiftId, user_id: userId, bar_id: barId, event_id: eventId,
      staff_member_id: staff.id, staff_name: staff.full_name, staff_category: staff.category,
      product_id: product.id, product_name: product.name, quantity: qty,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Staff consumption logged");
    printTicket({
      title: "CONSUMO STAFF",
      subtitle: `${staff.full_name} · ${String(staff.category).toUpperCase()}`,
      lines: [{ left: `${qty}x ${product.name}`, right: "—" }],
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-bold">STAFF CONSUMPTION · Step {step}/3</h3>
          <button onClick={onClose} className="text-2xl text-muted-foreground">×</button>
        </div>

        {step === 1 && (
          <div>
            <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Type staff name…"
              className="w-full rounded-lg border border-border bg-input px-4 py-3 outline-none focus:ring-2 ring-ring" />
            <div className="mt-3 max-h-72 space-y-2 overflow-auto">
              {search.length >= 2 && matches?.length === 0 && (
                <div className="rounded-lg border border-destructive p-4 text-center text-destructive">
                  STAFF MEMBER NOT FOUND
                </div>
              )}
              {matches?.map((m: any) => (
                <button key={m.id} onClick={() => { setStaff(m); setStep(2); }}
                  className="block w-full rounded-lg border border-border bg-background p-3 text-left hover:border-primary">
                  <div className="font-bold">{m.full_name}</div>
                  <div className="text-xs uppercase text-muted-foreground">{m.category}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <div className="mb-2 text-sm">For: <b>{staff?.full_name}</b> ({staff?.category})</div>
            <div className="grid max-h-80 grid-cols-2 gap-2 overflow-auto">
              {products?.map((p: any) => (
                <button key={p.id} onClick={() => { setProductId(p.id); setStep(3); }}
                  className={`rounded-lg border p-3 text-left ${productId === p.id ? "border-primary" : "border-border"} hover:border-primary`}>
                  <div className="text-xs uppercase text-muted-foreground">{p.category}</div>
                  <div className="font-bold">{p.name}</div>
                </button>
              ))}
            </div>
            <button onClick={() => setStep(1)} className="mt-3 text-sm text-muted-foreground">← back</button>
          </div>
        )}

        {step === 3 && (
          <div>
            <div className="mb-2 text-sm">For: <b>{staff?.full_name}</b></div>
            <div className="mb-4 text-sm">Product: <b>{product?.name}</b></div>
            <div className="flex items-center justify-center gap-4">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="h-14 w-14 rounded-lg border border-border text-2xl">−</button>
              <div className="text-5xl font-black w-20 text-center">{qty}</div>
              <button onClick={() => setQty((q) => q + 1)} className="h-14 w-14 rounded-lg border border-border text-2xl">+</button>
            </div>
            <button disabled={busy} onClick={confirm}
              className="mt-6 w-full rounded-lg bg-primary py-4 font-bold uppercase tracking-widest text-primary-foreground disabled:opacity-50">
              Confirm
            </button>
            <button onClick={() => setStep(2)} className="mt-3 w-full text-center text-sm text-muted-foreground">← back</button>
          </div>
        )}
      </div>
    </div>
  );
}
