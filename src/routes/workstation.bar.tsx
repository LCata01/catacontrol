import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Guard } from "@/components/Guard";
import { TopBar } from "@/components/TopBar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/workstation/bar")({
  component: () => <Guard requireRole="cashier"><Pick /></Guard>,
});

function Pick() {
  const navigate = useNavigate();
  const { setLock } = useAuth();
  const { data: bars } = useQuery({
    queryKey: ["bars-active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("bars").select("*").eq("active", true).order("name");
      if (error) throw error;
      return data!;
    },
  });

  const choose = (b: { id: string; name: string }) => {
    // shiftId placeholder; we open shift in /bar after entering initial cash
    setLock({ kind: "bar", id: b.id, name: b.name, shiftId: "" });
    navigate({ to: "/bar" });
  };

  return (
    <div className="min-h-screen">
      <TopBar title="SELECT BAR" back="/workstation" />
      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-4 px-6 py-8 sm:grid-cols-3 md:grid-cols-5">
        {bars?.map((b: any) => (
          <button key={b.id} onClick={() => choose(b)}
            className="aspect-square rounded-2xl border-2 border-border bg-card text-2xl font-black hover:border-primary">
            {b.name}
          </button>
        ))}
      </div>
    </div>
  );
}
