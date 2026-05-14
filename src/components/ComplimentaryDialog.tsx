import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { printTicket } from "@/lib/printer";

export function ComplimentaryDialog({
  shiftId, entryId, eventId, onClose,
}: {
  shiftId: string; entryId: string; eventId: string | null; onClose: () => void;
}) {
  const { userId } = useAuth();
  const [ticketTypeId, setTicketTypeId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [guest, setGuest] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: types } = useQuery({
    queryKey: ["ticket-types-comp"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ticket_types").select("*").eq("active", true).order("name");
      if (error) throw error; return data!;
    },
  });

  const tt = types?.find((t: any) => t.id === ticketTypeId);

  const save = async () => {
    if (!userId || !tt || !guest.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("complimentary_tickets").insert({
      shift_id: shiftId, user_id: userId, entry_id: entryId, event_id: eventId,
      ticket_type_id: tt.id, ticket_category: tt.name,
      guest_name: guest.trim(), notes: notes.trim() || null, quantity: qty,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Complimentary ticket saved");
    printTicket({
      title: "ENTRADA CORTESÍA",
      subtitle: tt.name,
      lines: [{ left: `${qty}x ${tt.name}`, right: "FREE" }],
      guest, notes: notes || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-bold">FREE ENTRY</h3>
          <button onClick={onClose} className="text-2xl text-muted-foreground">×</button>
        </div>

        <label className="mb-1 block text-xs uppercase tracking-widest text-muted-foreground">Ticket type</label>
        <div className="mb-4 grid grid-cols-2 gap-2">
          {types?.map((t: any) => (
            <button key={t.id} onClick={() => setTicketTypeId(t.id)}
              className={`rounded-lg border p-3 text-left ${ticketTypeId === t.id ? "border-primary" : "border-border"}`}>
              <div className="text-sm font-bold">{t.name}</div>
              {t.is_complimentary ? <div className="text-[10px] text-warning">COMPLIMENTARY</div> : <div className="text-[10px] text-muted-foreground">PAID TYPE</div>}
            </button>
          ))}
        </div>

        <label className="mb-1 block text-xs uppercase tracking-widest text-muted-foreground">Guest name</label>
        <input value={guest} onChange={(e) => setGuest(e.target.value)}
          className="mb-4 w-full rounded-lg border border-border bg-input px-4 py-3 outline-none focus:ring-2 ring-ring" />

        <label className="mb-1 block text-xs uppercase tracking-widest text-muted-foreground">Notes (optional)</label>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Press, Artist guest, Sponsor…"
          className="mb-4 w-full rounded-lg border border-border bg-input px-4 py-3 outline-none focus:ring-2 ring-ring" />

        <label className="mb-1 block text-xs uppercase tracking-widest text-muted-foreground">Quantity</label>
        <div className="flex items-center justify-center gap-4">
          <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="h-12 w-12 rounded-lg border border-border text-xl">−</button>
          <div className="w-16 text-center text-4xl font-black">{qty}</div>
          <button onClick={() => setQty((q) => q + 1)} className="h-12 w-12 rounded-lg border border-border text-xl">+</button>
        </div>

        <button disabled={busy || !ticketTypeId || !guest.trim()} onClick={save}
          className="mt-6 w-full rounded-lg bg-primary py-4 font-bold uppercase tracking-widest text-primary-foreground disabled:opacity-50">
          Save & print
        </button>
      </div>
    </div>
  );
}
