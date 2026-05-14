import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { dt, money } from "@/lib/format";
import { forceCloseShift } from "@/lib/admin-users.functions";

export const Route = createFileRoute("/admin/cashboxes")({ component: CashboxesPage });

function CashboxesPage() {
  const qc = useQueryClient();
  const closeFn = useServerFn(forceCloseShift);

  const { data, refetch } = useQuery({
    queryKey: ["open-shifts"],
    queryFn: async () => {
      const [{ data: shifts }, { data: profiles }, { data: bars }, { data: entries }] =
        await Promise.all([
          supabase
            .from("shifts")
            .select("*")
            .eq("status", "open")
            .order("opened_at", { ascending: true }),
          supabase.from("profiles").select("id, username, display_name"),
          supabase.from("bars").select("id, name"),
          supabase.from("entries").select("id, name"),
        ]);
      const P: Record<string, any> = {};
      profiles?.forEach((p: any) => (P[p.id] = p));
      const B: Record<string, any> = {};
      bars?.forEach((b: any) => (B[b.id] = b));
      const E: Record<string, any> = {};
      entries?.forEach((e: any) => (E[e.id] = e));
      return (shifts ?? []).map((s: any) => ({
        ...s,
        user: P[s.user_id]?.display_name || P[s.user_id]?.username || "—",
        place: s.kind === "bar" ? B[s.bar_id]?.name : E[s.entry_id]?.name,
      }));
    },
    refetchInterval: 5000,
  });

  useEffect(() => {
    const ch = supabase
      .channel("admin-cashboxes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shifts" },
        () => refetch(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [refetch]);

  const hardClose = async (s: any) => {
    if (
      !confirm(
        `CIERRE FORZADO\n\nUsuario: ${s.user}\nPuesto: ${s.place}\n\n¿Confirmar cierre del turno?`,
      )
    )
      return;
    try {
      await closeFn({ data: { shiftId: s.id } });
      toast.success("Turno cerrado");
      qc.invalidateQueries({ queryKey: ["open-shifts"] });
    } catch (e: any) {
      toast.error(e.message ?? "Error");
    }
  };

  if (!data) return <div className="text-muted-foreground">Cargando…</div>;

  const bars = data.filter((s: any) => s.kind === "bar");
  const entries = data.filter((s: any) => s.kind === "entry");

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-black uppercase">Cajas Abiertas</h2>
      <p className="text-sm text-muted-foreground">
        Cierre forzado de turnos. Esto liberará el puesto y permitirá que otro usuario lo use.
      </p>

      <Section title={`Barras (${bars.length})`} rows={bars} onClose={hardClose} />
      <Section title={`Entradas (${entries.length})`} rows={entries} onClose={hardClose} />
    </div>
  );
}

function Section({
  title,
  rows,
  onClose,
}: {
  title: string;
  rows: any[];
  onClose: (s: any) => void;
}) {
  return (
    <div className="overflow-auto rounded-xl border border-border bg-card">
      <div className="border-b border-border bg-muted px-4 py-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
        {title}
      </div>
      {rows.length === 0 ? (
        <div className="p-6 text-center text-sm text-muted-foreground">Ninguna caja abierta</div>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="px-4 py-2">Puesto</th>
              <th className="px-4 py-2">Usuario</th>
              <th className="px-4 py-2">Apertura</th>
              <th className="px-4 py-2">Efectivo inicial</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} className="border-t border-border">
                <td className="px-4 py-3 font-bold">{s.place ?? "—"}</td>
                <td className="px-4 py-3">{s.user}</td>
                <td className="px-4 py-3">{dt(s.opened_at)}</td>
                <td className="px-4 py-3">{money(s.initial_cash)}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => onClose(s)}
                    className="rounded-lg bg-destructive px-4 py-2 text-xs font-bold uppercase tracking-widest text-destructive-foreground hover:bg-destructive/90"
                  >
                    Cierre forzado
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
