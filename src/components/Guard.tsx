import { ReactNode, useEffect } from "react";
import { useAuth, AppRole } from "@/lib/auth-context";
import { useTenant } from "@/lib/tenant-context";
import { useNavigate } from "@tanstack/react-router";

export function Guard({
  children, requireRole, requireLock,
}: {
  children: ReactNode;
  requireRole?: AppRole | AppRole[];
  requireLock?: "bar" | "entry";
}) {
  const { loading, session, role, lock } = useAuth();
  const { tenant, loading: tLoading } = useTenant();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || tLoading) return;
    if (role === "platform_admin") {
      const allowed = requireRole && (Array.isArray(requireRole) ? requireRole : [requireRole]).includes("platform_admin");
      if (!allowed) { navigate({ to: "/platform" }); return; }
    } else {
      if (!tenant) { navigate({ to: "/tenant-login" }); return; }
    }
    if (!session) { navigate({ to: "/login" }); return; }
    if (!role || role === "disabled") { navigate({ to: "/login" }); return; }
    if (requireRole) {
      const allowed = Array.isArray(requireRole) ? requireRole : [requireRole];
      if (!allowed.includes(role)) {
        if (role === "superadmin") navigate({ to: "/admin" });
        else navigate({ to: "/" });
        return;
      }
    }
    if (requireLock && (!lock || lock.kind !== requireLock)) {
      navigate({ to: "/workstation" });
    }
  }, [loading, tLoading, tenant, session, role, lock, requireRole, requireLock, navigate]);

  if (loading || tLoading || !session || !role) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>;
  }
  return <>{children}</>;
}
