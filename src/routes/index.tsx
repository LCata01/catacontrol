import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useTenant } from "@/lib/tenant-context";

export const Route = createFileRoute("/")({
  component: IndexRedirect,
});

function IndexRedirect() {
  const navigate = useNavigate();
  const { loading, session, role, lock } = useAuth();
  const { tenant, loading: tLoading } = useTenant();

  useEffect(() => {
    if (loading || tLoading) return;
    if (role === "platform_admin") { navigate({ to: "/platform" }); return; }
    if (!tenant) { navigate({ to: "/tenant-login" }); return; }
    if (!session) { navigate({ to: "/login" }); return; }
    if (role === "disabled" || !role) { navigate({ to: "/login" }); return; }
    if (role === "superadmin") { navigate({ to: "/admin" }); return; }
    if (lock?.kind === "bar") navigate({ to: "/bar" });
    else if (lock?.kind === "entry") navigate({ to: "/entry" });
    else navigate({ to: "/workstation" });
  }, [loading, tLoading, tenant, session, role, lock, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>
  );
}
