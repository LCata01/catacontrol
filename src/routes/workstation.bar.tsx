import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Guard } from "@/components/Guard";
import { TopBar } from "@/components/TopBar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { naturalSort } from "@/lib/sort";
import { useEffect } from "react";

export const Route = createFileRoute("/workstation/bar")({
  component: () => <Guard requireRole="cashier"><Pick /></Guard>,
});

function Pick() {
  const navigate = useNavigate();
  const { setLock, userId } = useAuth();

  const { data: bars } = useQuery({
    queryKey: ["bars-active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("bars").select("*").eq("active", true);
      if (error) throw error;
      return naturalSort(data!);
    },
  });

  const { data: openShifts, refetch } = useQuery({
    queryKey: ["open-bar-shifts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shifts")
        .select("id, bar_id, user_id, profiles!shifts_user_id_fkey(username)")
        .eq("status", "open").eq("kind", "bar");
      if (error) throw error;
      return data!;
    },
    refetchInterval: 5000,
  });

  useEffect(() => {
    const ch = supabase.channel("ws-bar-shifts")
      .on("postgres_changes", { event: "*", schema: "public", table: "shifts" }, () => refetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [refetch]);

  const occupants = new Map<string, any>();
  (openShifts ?? []).forEach((s: any) => occupants.set(s.bar_id, s));

  const choose = (b: { id: string; name: string }) => {
    const occ = occupants.get(b.id);
    if (occ && occ.user_id !== userId) {
      alert(`PUESTO YA EN USO\n\nEste puesto ya tiene un usuario activo: ${occ.profiles?.username ?? "—"}`);
      return;
    }
    setLock({ kind: "bar", id: b.id, name: b.name, shiftId: occ?.id ?? "" });
    navigate({ to: "/bar" });
  };

  return (
    <div className="min-h-screen">
      <TopBar title="SELECCIONAR BARRA" back="/workstation" />
      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-4 px-6 py-8 sm:grid-cols-3 md:grid-cols-5">
        {bars?.map((b: any) => {
          const occ = occupants.get(b.id);
          const mine = occ && occ.user_id === userId;
          const taken = occ && !mine;
          return (
            <button key={b.id} onClick={() => choose(b)} disabled={taken}
              className={`relative aspect-square rounded-2xl border-2 p-2 text-2xl font-black transition ${
                taken ? "cursor-not-allowed border-destructive bg-destructive/10 text-destructive opacity-70"
                : mine ? "border-success bg-success/10"
                : "border-border bg-card hover:border-primary"
              }`}>
              <div>{b.name}</div>
              {taken && (
                <div className="mt-2 text-[10px] uppercase tracking-widest leading-tight">
                  EN USO<br/>{occ.profiles?.username}
                </div>
              )}
              {mine && (
                <div className="mt-2 text-[10px] uppercase tracking-widest text-success">TU TURNO</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
