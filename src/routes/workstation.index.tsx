import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { TopBar } from "@/components/TopBar";
import { useAuth } from "@/lib/auth-context";
import { useEffect } from "react";

export const Route = createFileRoute("/workstation/")({
  component: WorkstationIndex,
});

function WorkstationIndex() {
  const { lock } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (lock?.kind === "bar") navigate({ to: "/bar" });
    else if (lock?.kind === "entry") navigate({ to: "/entry" });
  }, [lock, navigate]);

  return (
    <div className="min-h-screen">
      <TopBar title="SELECCIONAR PUESTO" />
      <div className="mx-auto grid max-w-4xl gap-6 px-6 py-12 md:grid-cols-2">
        <Link
          to="/workstation/bar"
          className="group flex aspect-square flex-col items-center justify-center rounded-3xl border-2 border-border bg-card p-10 text-center hover:border-primary"
        >
          <div className="text-7xl font-black">BARRA</div>
          <div className="mt-3 text-sm uppercase tracking-widest text-muted-foreground">
            Vender productos · Consumos staff
          </div>
        </Link>
        <Link
          to="/workstation/entry"
          className="group flex aspect-square flex-col items-center justify-center rounded-3xl border-2 border-border bg-card p-10 text-center hover:border-primary"
        >
          <div className="text-7xl font-black">ENTRADA</div>
          <div className="mt-3 text-sm uppercase tracking-widest text-muted-foreground">
            Tickets · Pulseras · Cortesías
          </div>
        </Link>
      </div>
    </div>
  );
}
