import { ReactNode, useEffect } from "react";
import { useAuth, AppRole } from "@/lib/auth-context";
import { useNavigate } from "@tanstack/react-router";

export function Guard({
  children, requireRole, requireLock,
}: {
  children: ReactNode;
  requireRole?: AppRole | AppRole[];
  requireLock?: "bar" | "entry";
}) {
  const { loading, session, role, lock } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
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
  }, [loading, session, role, lock, requireRole, requireLock, navigate]);

  if (loading || !session || !role) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>;
  }
  return <>{children}</>;
}
