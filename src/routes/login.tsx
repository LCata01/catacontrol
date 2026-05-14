import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useTenant } from "@/lib/tenant-context";
import { PasswordInput } from "@/components/PasswordInput";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { signIn, session, role, loading } = useAuth();
  const { tenant, loading: tenantLoading, clearTenant } = useTenant();
  const navigate = useNavigate();
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (tenantLoading) return;
    if (!tenant) { navigate({ to: "/tenant-login" }); return; }
    if (!loading && session && role && role !== "disabled") {
      navigate({ to: "/" });
    }
  }, [loading, tenantLoading, tenant, session, role, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!u || !p || !tenant) return;
    setBusy(true);
    try {
      await signIn(u, p, tenant.code);
      toast.success("Bienvenido");
      navigate({ to: "/" });
    } catch (err: any) {
      toast.error(err.message ?? "Error al ingresar");
    } finally {
      setBusy(false);
    }
  };

  if (!tenant) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-10 text-center">
          <h1 className="text-5xl font-black tracking-tight">CATA<span className="text-muted-foreground"> </span>CONTROL</h1>
          <p className="mt-2 text-sm uppercase tracking-[0.3em] text-muted-foreground">NIGHT APP</p>
        </div>

        <div className="mb-4 flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-sm">
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Boliche</div>
            <div className="font-bold">{tenant.name}</div>
          </div>
          <button
            type="button"
            onClick={() => { clearTenant(); navigate({ to: "/tenant-login" }); }}
            className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
          >Cambiar</button>
        </div>

        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-border bg-card p-8">
          <div>
            <label className="mb-2 block text-xs uppercase tracking-widest text-muted-foreground">Usuario</label>
            <input
              autoFocus autoCapitalize="off" autoCorrect="off" autoComplete="username"
              value={u} onChange={(e) => setU(e.target.value)}
              className="w-full rounded-lg border border-border bg-input px-4 py-4 text-lg outline-none ring-ring focus:ring-2"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs uppercase tracking-widest text-muted-foreground">Contraseña</label>
            <input
              type="password" autoComplete="current-password"
              value={p} onChange={(e) => setP(e.target.value)}
              className="w-full rounded-lg border border-border bg-input px-4 py-4 text-lg outline-none ring-ring focus:ring-2"
            />
          </div>
          <button
            type="submit" disabled={busy}
            className="w-full rounded-lg bg-primary py-5 text-lg font-bold uppercase tracking-widest text-primary-foreground disabled:opacity-50"
          >{busy ? "…" : "Ingresar"}</button>
        </form>
        <p className="mt-6 text-center text-xs text-muted-foreground">HECHO CON AMOR PARA TEMPLITO!</p>
        <p className="mt-2 text-center text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          <Link to="/platform-login" className="hover:text-foreground">Acceso plataforma</Link>
        </p>
      </div>
    </div>
  );
}
