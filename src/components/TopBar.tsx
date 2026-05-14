import { ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import { useNavigate, Link } from "@tanstack/react-router";
import { LogOut } from "lucide-react";

export function TopBar({ title, right, back }: { title: string; right?: ReactNode; back?: string }) {
  const { username, role, signOut, lock } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-background/95 px-6 py-3 backdrop-blur">
      <div className="flex items-center gap-4">
        {back && (
          <Link to={back} className="rounded-md border border-border px-3 py-2 text-sm hover:bg-accent">←</Link>
        )}
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">CATA CONTROL</div>
          <div className="text-lg font-bold leading-tight">{title}</div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {right}
        {lock && (
          <div className="hidden rounded-md border border-border bg-card px-3 py-1.5 text-xs uppercase tracking-widest md:block">
            {lock.kind === "bar" ? "BAR" : "ENTRY"} · {lock.name}
          </div>
        )}
        <div className="hidden text-right text-xs leading-tight md:block">
          <div className="font-bold uppercase">{username}</div>
          <div className="text-muted-foreground uppercase">{role}</div>
        </div>
        <button
          onClick={async () => { await signOut(); navigate({ to: "/login" }); }}
          className="rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-destructive hover:border-destructive"
          title="Logout"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
