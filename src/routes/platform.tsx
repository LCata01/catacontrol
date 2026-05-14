import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listCompanies, createCompany, toggleCompanyActive, resetCompanyPassword } from "@/lib/tenant.functions";
import { TopBar } from "@/components/TopBar";
import { PasswordInput } from "@/components/PasswordInput";
import { toast } from "sonner";

export const Route = createFileRoute("/platform")({
  component: PlatformPage,
});

function PlatformPage() {
  const { loading, session, role, signOut } = useAuth();
  const navigate = useNavigate();
  const list = useServerFn(listCompanies);
  const create = useServerFn(createCompany);
  const toggle = useServerFn(toggleCompanyActive);
  const reset = useServerFn(resetCompanyPassword);
  const qc = useQueryClient();

  useEffect(() => {
    if (loading) return;
    if (!session) { navigate({ to: "/platform-login" }); return; }
    if (role !== "platform_admin") { navigate({ to: "/" }); return; }
  }, [loading, session, role, navigate]);

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["platform-companies"],
    queryFn: () => list({}),
    enabled: role === "platform_admin",
  });

  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [pwd, setPwd] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await create({ data: { name, code, password: pwd } });
      toast.success("Boliche creado");
      setName(""); setCode(""); setPwd(""); setShowNew(false);
      qc.invalidateQueries({ queryKey: ["platform-companies"] });
    } catch (err: any) {
      toast.error(err.message);
    } finally { setBusy(false); }
  };

  const onToggle = async (id: string, active: boolean) => {
    try { await toggle({ data: { id, active: !active } }); qc.invalidateQueries({ queryKey: ["platform-companies"] }); }
    catch (e: any) { toast.error(e.message); }
  };

  const onReset = async (id: string, codeName: string) => {
    const np = prompt(`Nueva contraseña para ${codeName}:`);
    if (!np || np.length < 6) { toast.error("Mínimo 6 caracteres"); return; }
    try { await reset({ data: { id, password: np } }); toast.success("Contraseña actualizada"); }
    catch (e: any) { toast.error(e.message); }
  };

  if (loading || !session || role !== "platform_admin") {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Cargando…</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar title="PLATAFORMA — Administración Global" />
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black">Boliches</h2>
          <button onClick={() => setShowNew(v => !v)}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-bold uppercase tracking-widest text-primary-foreground">
            {showNew ? "Cancelar" : "+ Nuevo Boliche"}
          </button>
        </div>

        {showNew && (
          <form onSubmit={submit} className="grid gap-4 rounded-2xl border border-border bg-card p-6 md:grid-cols-3">
            <input required placeholder="Nombre" value={name} onChange={e => setName(e.target.value)}
              className="rounded-lg border border-border bg-input px-4 py-3" />
            <input required placeholder="CÓDIGO" value={code} onChange={e => setCode(e.target.value.toUpperCase())}
              className="rounded-lg border border-border bg-input px-4 py-3 uppercase" />
            <input required type="password" placeholder="Contraseña" value={pwd} onChange={e => setPwd(e.target.value)}
              className="rounded-lg border border-border bg-input px-4 py-3" />
            <button disabled={busy} className="md:col-span-3 rounded-lg bg-primary py-3 font-bold uppercase tracking-widest text-primary-foreground disabled:opacity-50">
              {busy ? "Creando…" : "Crear boliche"}
            </button>
          </form>
        )}

        <div className="rounded-2xl border border-border bg-card">
          {isLoading ? (
            <div className="p-6 text-muted-foreground">Cargando…</div>
          ) : companies.length === 0 ? (
            <div className="p-6 text-muted-foreground">Sin boliches</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs uppercase tracking-widest text-muted-foreground">
                <tr><th className="p-3">Nombre</th><th className="p-3">Código</th><th className="p-3">Estado</th><th className="p-3 text-right">Acciones</th></tr>
              </thead>
              <tbody>
                {companies.map((c: any) => (
                  <tr key={c.id} className="border-b border-border last:border-0">
                    <td className="p-3 font-bold">{c.name}</td>
                    <td className="p-3 font-mono">{c.code}</td>
                    <td className="p-3">{c.active ? <span className="text-green-500">ACTIVO</span> : <span className="text-destructive">INACTIVO</span>}</td>
                    <td className="p-3 text-right">
                      <button onClick={() => onReset(c.id, c.code)} className="mr-2 rounded border border-border px-3 py-1 text-xs hover:bg-accent">Reset Pass</button>
                      <button onClick={() => onToggle(c.id, c.active)} className="rounded border border-border px-3 py-1 text-xs hover:bg-accent">{c.active ? "Desactivar" : "Activar"}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex justify-end">
          <button onClick={async () => { await signOut(); navigate({ to: "/platform-login" }); }}
            className="rounded-lg border border-border px-4 py-2 text-sm">Cerrar sesión</button>
        </div>
      </div>
    </div>
  );
}
