import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { signIn, session, role, loading } = useAuth();
  const navigate = useNavigate();
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && session && role && role !== "disabled") {
      navigate({ to: "/" });
    }
  }, [loading, session, role, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!u || !p) return;
    setBusy(true);
    try {
      await signIn(u, p);
      toast.success("Bienvenido");
      navigate({ to: "/" });
    } catch (err: any) {
      toast.error(err.message ?? "Error al ingresar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-10 text-center">
          <h1 className="text-5xl font-black tracking-tight">CATA<span className="text-muted-foreground"> </span>CONTROL</h1>
          <p className="mt-2 text-sm uppercase tracking-[0.3em] text-muted-foreground">NIGHT APP</p>
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
      </div>
    </div>
  );
}
