import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Guard } from "@/components/Guard";
import { TopBar } from "@/components/TopBar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/workstation/entry")({
  component: () => <Guard requireRole="cashier"><Pick /></Guard>,
});

function Pick() {
  const navigate = useNavigate();
  const { setLock } = useAuth();
  const { data } = useQuery({
    queryKey: ["entries-active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("entries").select("*").eq("active", true).order("name");
      if (error) throw error;
      return data!;
    },
  });

  const choose = (e: { id: string; name: string }) => {
    setLock({ kind: "entry", id: e.id, name: e.name, shiftId: "" });
    navigate({ to: "/entry" });
  };

  return (
    <div className="min-h-screen">
      <TopBar title="SELECT ENTRY TERMINAL" back="/workstation" />
      <div className="mx-auto grid max-w-3xl grid-cols-2 gap-4 px-6 py-8 sm:grid-cols-3 md:grid-cols-5">
        {data?.map((e: any) => (
          <button key={e.id} onClick={() => choose(e)}
            className="aspect-square rounded-2xl border-2 border-border bg-card text-xl font-black hover:border-primary">
            {e.name}
          </button>
        ))}
      </div>
    </div>
  );
}
