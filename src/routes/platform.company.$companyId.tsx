import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { TopBar } from "@/components/TopBar";
import { PasswordInput } from "@/components/PasswordInput";
import { toast } from "sonner";
import { listCompanies } from "@/lib/tenant.functions";
import {
  listCompanyUsers,
  createCompanyUser,
  updateCompanyUser,
  deleteCompanyUser,
} from "@/lib/platform-users.functions";

export const Route = createFileRoute("/platform/company/$companyId")({
  component: CompanyDetailPage,
});

function prettifyError(e: any): string {
  const msg = e?.message ?? String(e);
  try {
    const parsed = JSON.parse(msg);
    if (Array.isArray(parsed) && parsed[0]?.message) {
      return parsed.map((p: any) => `${p.path?.join(".") ?? ""}: ${p.message}`).join(" · ");
    }
  } catch {}
  if (/at least 6 character/i.test(msg)) return "La contraseña debe tener al menos 6 caracteres";
  if (/Invalid.*regex|String must match/i.test(msg)) return "Usuario inválido (sólo letras, números, _ . -)";
  return msg;
}

const ROLE_LABEL: Record<string, string> = {
  superadmin: "Superadmin",
  cashier: "Cajero",
  disabled: "Deshabilitado",
};

function CompanyDetailPage() {
  const { companyId } = Route.useParams();
  const { loading, session, role } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const list = useServerFn(listCompanies);
  const listUsers = useServerFn(listCompanyUsers);
  const createUser = useServerFn(createCompanyUser);
  const updateUser = useServerFn(updateCompanyUser);
  const deleteUser = useServerFn(deleteCompanyUser);

  useEffect(() => {
    if (loading) return;
    if (!session) { navigate({ to: "/platform-login" }); return; }
    if (role !== "platform_admin") { navigate({ to: "/" }); return; }
  }, [loading, session, role, navigate]);

  const { data: companies = [] } = useQuery({
    queryKey: ["platform-companies"],
    queryFn: () => list({}),
    enabled: role === "platform_admin",
  });

  const company = companies.find((c: any) => c.id === companyId);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["platform-company-users", companyId],
    queryFn: () => listUsers({ data: { companyId } }),
    enabled: role === "platform_admin",
  });

  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  if (loading || !session || role !== "platform_admin") {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Cargando…</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar title={`PLATAFORMA — ${company?.name ?? "Boliche"}`} />
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <Link to="/platform" className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">← Volver</Link>
            <h2 className="mt-1 text-2xl font-black">
              {company?.name} <span className="font-mono text-sm text-muted-foreground">({company?.code})</span>
            </h2>
          </div>
          <button onClick={() => setShowNew(v => !v)}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-bold uppercase tracking-widest text-primary-foreground">
            {showNew ? "Cancelar" : "+ Nuevo Usuario"}
          </button>
        </div>

        {showNew && (
          <NewUserForm
            onSubmit={async (vals) => {
              try {
                await createUser({ data: { companyId, ...vals } });
                toast.success("Usuario creado");
                setShowNew(false);
                qc.invalidateQueries({ queryKey: ["platform-company-users", companyId] });
              } catch (e: any) { toast.error(prettifyError(e)); }
            }}
          />
        )}

        <div className="overflow-auto rounded-2xl border border-border bg-card">
          {isLoading ? (
            <div className="p-6 text-muted-foreground">Cargando…</div>
          ) : users.length === 0 ? (
            <div className="p-6 text-muted-foreground">Sin usuarios. Creá el primero arriba.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="p-3">Usuario</th>
                  <th className="p-3">Nombre</th>
                  <th className="p-3">Rol</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u: any) => (
                  <tr key={u.id} className="border-b border-border last:border-0">
                    <td className="p-3 font-bold">{u.username}</td>
                    <td className="p-3">{u.display_name}</td>
                    <td className="p-3">{ROLE_LABEL[u.role] ?? "—"}</td>
                    <td className="p-3">
                      {u.active ? <span className="text-green-500">ACTIVO</span> : <span className="text-destructive">INACTIVO</span>}
                    </td>
                    <td className="p-3 text-right space-x-2">
                      <button
                        onClick={async () => {
                          try {
                            await updateUser({ data: { companyId, targetUserId: u.id, active: !u.active } });
                            qc.invalidateQueries({ queryKey: ["platform-company-users", companyId] });
                          } catch (e: any) { toast.error(prettifyError(e)); }
                        }}
                        className="rounded border border-border px-3 py-1 text-xs hover:bg-accent"
                      >
                        {u.active ? "Desactivar" : "Activar"}
                      </button>
                      <button onClick={() => setEditing(u)} className="rounded border border-border px-3 py-1 text-xs hover:bg-accent">
                        Editar
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm(`¿Borrar el usuario ${u.username}? Esta acción no se puede deshacer.`)) return;
                          try {
                            await deleteUser({ data: { companyId, targetUserId: u.id } });
                            toast.success("Usuario borrado");
                            qc.invalidateQueries({ queryKey: ["platform-company-users", companyId] });
                          } catch (e: any) { toast.error(prettifyError(e)); }
                        }}
                        className="rounded border border-destructive px-3 py-1 text-xs text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      >
                        Borrar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {editing && (
        <EditUserDialog
          user={editing}
          onClose={() => setEditing(null)}
          onSave={async (vals) => {
            try {
              await updateUser({ data: { companyId, targetUserId: editing.id, ...vals } });
              toast.success("Usuario actualizado");
              setEditing(null);
              qc.invalidateQueries({ queryKey: ["platform-company-users", companyId] });
            } catch (e: any) { toast.error(prettifyError(e)); }
          }}
        />
      )}
    </div>
  );
}

function NewUserForm({ onSubmit }: { onSubmit: (v: { username: string; displayName: string; password: string; role: "superadmin" | "cashier" | "disabled" }) => Promise<void> }) {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"superadmin" | "cashier" | "disabled">("cashier");
  const [busy, setBusy] = useState(false);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        await onSubmit({ username, displayName, password, role });
        setBusy(false);
        setUsername(""); setDisplayName(""); setPassword("");
      }}
      className="grid gap-4 rounded-2xl border border-border bg-card p-6 md:grid-cols-2"
    >
      <input required placeholder="Usuario" value={username} onChange={e => setUsername(e.target.value)}
        pattern="[a-zA-Z0-9_.\-]+" minLength={2} maxLength={50}
        className="rounded-lg border border-border bg-input px-4 py-3" />
      <input placeholder="Nombre completo" value={displayName} onChange={e => setDisplayName(e.target.value)}
        maxLength={100} className="rounded-lg border border-border bg-input px-4 py-3" />
      <PasswordInput required placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)}
        minLength={6} className="rounded-lg border border-border bg-input px-4 py-3" />
      <select value={role} onChange={e => setRole(e.target.value as any)}
        className="rounded-lg border border-border bg-input px-4 py-3">
        <option value="superadmin">Superadmin</option>
        <option value="cashier">Cajero</option>
        <option value="disabled">Deshabilitado</option>
      </select>
      <button disabled={busy} className="md:col-span-2 rounded-lg bg-primary py-3 font-bold uppercase tracking-widest text-primary-foreground disabled:opacity-50">
        {busy ? "Creando…" : "Crear usuario"}
      </button>
    </form>
  );
}

function EditUserDialog({
  user, onClose, onSave,
}: {
  user: any;
  onClose: () => void;
  onSave: (v: { username?: string; displayName?: string; password?: string; role?: "superadmin" | "cashier" | "disabled" }) => Promise<void>;
}) {
  const [username, setUsername] = useState(user.username ?? "");
  const [displayName, setDisplayName] = useState(user.display_name ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<string>(user.role ?? "cashier");
  const [busy, setBusy] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const payload: any = {};
          if (username !== user.username) payload.username = username;
          if (displayName !== (user.display_name ?? "")) payload.displayName = displayName;
          if (password) payload.password = password;
          if (role !== user.role) payload.role = role;
          if (Object.keys(payload).length === 0) { onClose(); return; }
          setBusy(true);
          await onSave(payload);
          setBusy(false);
        }}
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 space-y-3"
      >
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xl font-bold">Editar usuario</h3>
          <button type="button" onClick={onClose} className="text-2xl text-muted-foreground">×</button>
        </div>
        <label className="block text-sm">
          <span className="mb-1 block text-xs uppercase tracking-widest text-muted-foreground">Usuario</span>
          <input value={username} onChange={e => setUsername(e.target.value)}
            pattern="[a-zA-Z0-9_.\-]+" minLength={2} maxLength={50} required
            className="w-full rounded border border-border bg-input px-3 py-2" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs uppercase tracking-widest text-muted-foreground">Nombre</span>
          <input value={displayName} onChange={e => setDisplayName(e.target.value)} maxLength={100}
            className="w-full rounded border border-border bg-input px-3 py-2" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs uppercase tracking-widest text-muted-foreground">Rol</span>
          <select value={role} onChange={e => setRole(e.target.value)}
            className="w-full rounded border border-border bg-input px-3 py-2">
            <option value="superadmin">Superadmin</option>
            <option value="cashier">Cajero</option>
            <option value="disabled">Deshabilitado</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs uppercase tracking-widest text-muted-foreground">
            Nueva contraseña (vacío = no cambiar)
          </span>
          <PasswordInput value={password} onChange={e => setPassword(e.target.value)}
            minLength={6} maxLength={72} autoComplete="new-password"
            className="w-full rounded border border-border bg-input px-3 py-2" />
        </label>
        <button type="submit" disabled={busy}
          className="mt-4 w-full rounded-lg bg-primary py-3 font-bold uppercase tracking-widest text-primary-foreground disabled:opacity-50">
          Guardar
        </button>
      </form>
    </div>
  );
}
