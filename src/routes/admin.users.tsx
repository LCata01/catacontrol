import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { updateUserCredentials } from "@/lib/admin-users.functions";
import { PasswordInput } from "@/components/PasswordInput";

export const Route = createFileRoute("/admin/users")({ component: UsersPage });

const ROLE_LABEL: Record<string, string> = {
  superadmin: "Superadmin",
  cashier: "Cajero",
  disabled: "Deshabilitado",
};

function UsersPage() {
  const qc = useQueryClient();
  const updateCreds = useServerFn(updateUserCredentials);
  const [editing, setEditing] = useState<any | null>(null);

  const { data } = useQuery({
    queryKey: ["users-admin"],
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").order("username"),
        supabase.from("user_roles").select("*"),
      ]);
      return (profiles ?? []).map((p: any) => ({
        ...p,
        role: roles?.find((r: any) => r.user_id === p.id)?.role ?? null,
      }));
    },
  });

  const setRole = async (userId: string, role: string) => {
    await supabase.from("user_roles").delete().eq("user_id", userId);
    if (role) {
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: role as "superadmin" | "cashier" | "disabled" });
      if (error) return toast.error(error.message);
    }
    toast.success("Rol actualizado");
    qc.invalidateQueries({ queryKey: ["users-admin"] });
  };

  const toggle = async (id: string, active: boolean) => {
    await supabase.from("profiles").update({ active }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["users-admin"] });
  };

  return (
    <div>
      <h2 className="mb-4 text-2xl font-black uppercase">Usuarios</h2>
      <div className="overflow-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Usuario</th>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((u: any) => (
              <tr key={u.id} className="border-t border-border">
                <td className="px-4 py-3 font-bold">{u.username}</td>
                <td className="px-4 py-3">{u.display_name}</td>
                <td className="px-4 py-3">
                  <select
                    value={u.role ?? ""}
                    onChange={(e) => setRole(u.id, e.target.value)}
                    className="rounded border border-border bg-input px-2 py-1.5"
                  >
                    <option value="">—</option>
                    <option value="superadmin">{ROLE_LABEL.superadmin}</option>
                    <option value="cashier">{ROLE_LABEL.cashier}</option>
                    <option value="disabled">{ROLE_LABEL.disabled}</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggle(u.id, !u.active)}
                    className={`rounded px-3 py-1 text-xs ${u.active ? "border border-success text-success" : "border border-destructive text-destructive"}`}
                  >
                    {u.active ? "Activo" : "Deshabilitado"}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => setEditing(u)}
                    className="rounded border border-border px-3 py-1 text-xs hover:bg-accent"
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <EditUserDialog
          user={editing}
          onClose={() => setEditing(null)}
          onSave={async (vals) => {
            try {
              await updateCreds({ data: { targetUserId: editing.id, ...vals } });
              toast.success("Usuario actualizado");
              setEditing(null);
              qc.invalidateQueries({ queryKey: ["users-admin"] });
            } catch (e: any) {
              toast.error(e.message ?? "Error");
            }
          }}
        />
      )}
    </div>
  );
}

function EditUserDialog({
  user,
  onClose,
  onSave,
}: {
  user: any;
  onClose: () => void;
  onSave: (v: { username?: string; displayName?: string; password?: string }) => Promise<void>;
}) {
  const [username, setUsername] = useState(user.username ?? "");
  const [displayName, setDisplayName] = useState(user.display_name ?? "");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {};
    if (username && username !== user.username) payload.username = username;
    if (displayName !== (user.display_name ?? "")) payload.displayName = displayName;
    if (password) payload.password = password;
    if (Object.keys(payload).length === 0) {
      onClose();
      return;
    }
    setBusy(true);
    await onSave(payload);
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-bold">Editar usuario</h3>
          <button type="button" onClick={onClose} className="text-2xl text-muted-foreground">
            ×
          </button>
        </div>
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block text-xs uppercase tracking-widest text-muted-foreground">
              Usuario
            </span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded border border-border bg-input px-3 py-2"
              pattern="[a-zA-Z0-9_.\-]+"
              minLength={2}
              maxLength={50}
              required
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs uppercase tracking-widest text-muted-foreground">
              Nombre
            </span>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded border border-border bg-input px-3 py-2"
              maxLength={100}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs uppercase tracking-widest text-muted-foreground">
              Nueva contraseña (dejar vacío para no cambiar)
            </span>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded border border-border bg-input px-3 py-2"
              minLength={6}
              maxLength={72}
              autoComplete="new-password"
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={busy}
          className="mt-6 w-full rounded-lg bg-primary py-3 font-bold uppercase tracking-widest text-primary-foreground disabled:opacity-50"
        >
          Guardar
        </button>
      </form>
    </div>
  );
}
