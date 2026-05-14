import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

const CATEGORIES: { value: string; label: string }[] = [
  { value: "dj", label: "DJ" },
  { value: "technical", label: "TECHNICAL" },
  { value: "security", label: "SECURITY" },
  { value: "photography", label: "PHOTOGRAPHY" },
  { value: "rrpp", label: "RRPP" },
  { value: "owner", label: "OWNER" },
  { value: "management", label: "MANAGEMENT" },
  { value: "guest", label: "GUEST" },
];

export function StaffConsumptionDialog({
  shiftId, barId, eventId, onClose,
}: {
  shiftId: string; barId: string; eventId: string | null; onClose: () => void;
}) {
  const { userId } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [category, setCategory] = useState<string | null>(null);
  const [staffId, setStaffId] = useState<string>("");
  const [productId, setProductId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
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
            <p className="mb-3 text-sm text-muted-foreground">SELECT STAFF CATEGORY</p>
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
            <p className="mb-3 text-sm">Category: <b>{CATEGORIES.find(c => c.value === category)?.label}</b></p>
            <label className="mb-1 block text-xs uppercase tracking-widest text-muted-foreground">Select staff member</label>
            <select value={staffId} onChange={(e) => setStaffId(e.target.value)}
              className="mb-4 w-full rounded-lg border border-border bg-input px-4 py-3 outline-none focus:ring-2 ring-ring">
              <option value="">— choose —</option>
              {staffList?.map((s: any) => (
                <option key={s.id} value={s.id}>{s.full_name}</option>
              ))}
            </select>
            {staffList && staffList.length === 0 && (
              <div className="rounded-lg border border-destructive p-3 text-center text-destructive">
                No staff registered in this category
              </div>
            )}
            <div className="flex justify-between">
              <button onClick={() => setStep(1)} className="text-sm text-muted-foreground">← back</button>
              <button disabled={!staffId} onClick={() => setStep(3)}
                className="rounded-lg bg-primary px-6 py-2 font-bold uppercase tracking-widest text-primary-foreground disabled:opacity-50">
                Next
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <div className="mb-2 text-sm">Staff: <b>{staff?.full_name}</b></div>
            <label className="mb-1 block text-xs uppercase tracking-widest text-muted-foreground">Select product (FREE)</label>
            <div className="mb-3 grid max-h-64 grid-cols-2 gap-2 overflow-auto">
              {products?.map((p: any) => (
                <button key={p.id} onClick={() => setProductId(p.id)}
                  className={`rounded-lg border p-3 text-left ${productId === p.id ? "border-primary" : "border-border"} hover:border-primary`}>
                  <div className="text-xs uppercase text-muted-foreground">{p.category}</div>
                  <div className="font-bold">{p.name}</div>
                </button>
              ))}
            </div>
            <div className="mb-4 flex items-center justify-center gap-4">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="h-12 w-12 rounded-lg border border-border text-2xl">−</button>
              <div className="w-16 text-center text-4xl font-black">{qty}</div>
              <button onClick={() => setQty((q) => q + 1)} className="h-12 w-12 rounded-lg border border-border text-2xl">+</button>
            </div>
            <button disabled={busy || !productId} onClick={confirm}
              className="w-full rounded-lg bg-primary py-4 font-bold uppercase tracking-widest text-primary-foreground disabled:opacity-50">
              Confirm (FREE)
            </button>
            <button onClick={() => setStep(2)} className="mt-3 w-full text-center text-sm text-muted-foreground">← back</button>
          </div>
        )}
      </div>
    </div>
  );
}
