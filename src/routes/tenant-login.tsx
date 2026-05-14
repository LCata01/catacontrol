import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useTenant } from "@/lib/tenant-context";
import { tenantLogin } from "@/lib/tenant.functions";
import { PasswordInput } from "@/components/PasswordInput";
import { toast } from "sonner";

export const Route = createFileRoute("/tenant-login")({
  component: TenantLoginPage,
});

function TenantLoginPage() {
  const navigate = useNavigate();
  const { tenant, setTenant, loading } = useTenant();
  const [code, setCode] = useState("");
  const [pwd, setPwd] = useState("");
  const [busy, setBusy] = useState(false);
  const login = useServerFn(tenantLogin);

  useEffect(() => {
    if (!loading && tenant) navigate({ to: "/login" });
  }, [loading, tenant, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !pwd) return;
    setBusy(true);
    try {
      const t = await login({ data: { code, password: pwd } });
      setTenant({ id: t.id, code: t.code, name: t.name });
      toast.success(`Bienvenido a ${t.name}`);
      navigate({ to: "/login" });
    } catch (err: any) {
      toast.error(err.message ?? "Error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-10 text-center">
          <h1 className="text-5xl font-black tracking-tight">CATA<span className="text-muted-foreground"> </span>CONTROL</h1>
          <p className="mt-2 text-sm uppercase tracking-[0.3em] text-muted-foreground">SELECCIONÁ TU BOLICHE</p>
        </div>
        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-border bg-card p-8">
          <div>
            <label className="mb-2 block text-xs uppercase tracking-widest text-muted-foreground">Nombre del establecimiento</label>
            <input
              autoFocus autoCapitalize="characters" autoCorrect="off"
              value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="w-full rounded-lg border border-border bg-input px-4 py-4 text-lg uppercase tracking-widest outline-none ring-ring focus:ring-2"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs uppercase tracking-widest text-muted-foreground">Contraseña del establecimiento</label>
            <PasswordInput
              value={pwd} onChange={(e) => setPwd(e.target.value)}
              className="w-full rounded-lg border border-border bg-input px-4 py-4 text-lg outline-none ring-ring focus:ring-2"
            />
          </div>
          <button
            type="submit" disabled={busy}
            className="w-full rounded-lg bg-primary py-5 text-lg font-bold uppercase tracking-widest text-primary-foreground disabled:opacity-50"
          >{busy ? "…" : "Continuar"}</button>
        </form>
        <p className="mt-6 text-center text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          <Link to="/platform-login" className="hover:text-foreground">ACCESO ADMINISTRADOR</Link>
        </p>
      </div>
    </div>
  );
}
