import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Guard } from "@/components/Guard";
import { TopBar } from "@/components/TopBar";
import { useAuth } from "@/lib/auth-context";
import { useEffect } from "react";

export const Route = createFileRoute("/workstation")({
  component: () => (
    <Guard requireRole="cashier">
      <Workstation />
    </Guard>
  ),
});

function Workstation() {
  const { lock } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (lock?.kind === "bar") navigate({ to: "/bar" });
    if (lock?.kind === "entry") navigate({ to: "/entry" });
  }, [lock, navigate]);

  return (
    <div className="min-h-screen">
      <TopBar title="SELECT WORKSTATION" />
      <div className="mx-auto grid max-w-4xl gap-6 px-6 py-12 md:grid-cols-2">
        <Link to="/workstation/bar"
          className="group flex aspect-square flex-col items-center justify-center rounded-3xl border-2 border-border bg-card p-10 text-center hover:border-primary">
          <div className="text-7xl font-black">BAR</div>
          <div className="mt-3 text-sm uppercase tracking-widest text-muted-foreground">Sell drinks · Staff consumptions</div>
        </Link>
        <Link to="/workstation/entry"
          className="group flex aspect-square flex-col items-center justify-center rounded-3xl border-2 border-border bg-card p-10 text-center hover:border-primary">
          <div className="text-7xl font-black">ENTRY</div>
          <div className="mt-3 text-sm uppercase tracking-widest text-muted-foreground">Tickets · Wristbands · Comps</div>
        </Link>
      </div>
    </div>
  );
}
