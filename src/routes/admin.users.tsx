import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/users")({ component: UsersPage });

const ROLE_LABEL: Record<string, string> = {
  superadmin: "Superadmin",
  cashier: "Cajero",
  disabled: "Deshabilitado",
};

function UsersPage() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["users-admin"],
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").order("username"),
        supabase.from("user_roles").select("*"),
      ]);
      return (profiles ?? []).map((p: any) => ({
        ...p, role: roles?.find((r: any) => r.user_id === p.id)?.role ?? null,
      }));
    },
  });

  const setRole = async (userId: string, role: string) => {
    await supabase.from("user_roles").delete().eq("user_id", userId);
    if (role) {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: role as "superadmin" | "cashier" | "disabled" });
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
            <tr><th className="px-4 py-3">Usuario</th><th className="px-4 py-3">Nombre</th><th className="px-4 py-3">Rol</th><th className="px-4 py-3">Estado</th></tr>
          </thead>
          <tbody>
            {data?.map((u: any) => (
              <tr key={u.id} className="border-t border-border">
                <td className="px-4 py-3 font-bold">{u.username}</td>
                <td className="px-4 py-3">{u.display_name}</td>
                <td className="px-4 py-3">
                  <select value={u.role ?? ""} onChange={(e) => setRole(u.id, e.target.value)}
                    className="rounded border border-border bg-input px-2 py-1.5">
                    <option value="">—</option>
                    <option value="superadmin">{ROLE_LABEL.superadmin}</option>
                    <option value="cashier">{ROLE_LABEL.cashier}</option>
                    <option value="disabled">{ROLE_LABEL.disabled}</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => toggle(u.id, !u.active)}
                    className={`rounded px-3 py-1 text-xs ${u.active ? "border border-success text-success" : "border border-destructive text-destructive"}`}>
                    {u.active ? "Activo" : "Deshabilitado"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">Las contraseñas se gestionan desde el sistema de autenticación. Para crear nuevas cuentas, contactá al administrador del sistema.</p>
    </div>
  );
}
