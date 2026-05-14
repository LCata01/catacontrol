import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["app-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("app_settings").select("*").maybeSingle();
      return data ?? { nightclub_name: "CATA CLUB", slogan: "", logo_url: null };
    },
  });

  const [name, setName] = useState("");
  const [slogan, setSlogan] = useState("");
  const [logo, setLogo] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!data) return;
    setName(data.nightclub_name ?? "");
    setSlogan(data.slogan ?? "");
    setLogo(data.logo_url ?? "");
  }, [data]);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("El archivo debe ser una imagen");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen no puede superar 5 MB");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `logo-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("branding").upload(path, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type,
    });
    setUploading(false);
    if (error) { toast.error(error.message); return; }
    const { data: pub } = supabase.storage.from("branding").getPublicUrl(path);
    setLogo(pub.publicUrl);
    toast.success("Logo subido — recordá guardar los cambios");
  };

  const removeLogo = () => {
    setLogo("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const save = async () => {
    setBusy(true);
    const { error } = await supabase.from("app_settings").update({
      nightclub_name: name.trim() || "CATA CLUB",
      slogan: slogan.trim(),
      logo_url: logo.trim() || null,
      updated_at: new Date().toISOString(),
    }).eq("id", true);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Configuración guardada");
    qc.invalidateQueries({ queryKey: ["app-settings"] });
  };

  if (isLoading) return <div className="text-muted-foreground">Cargando…</div>;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-black">Personalización del Ticket</h2>
        <p className="text-sm text-muted-foreground">Se aplica a los tickets impresos al instante.</p>
      </div>

      <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <Field label="Nombre del local">
          <input value={name} onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-border bg-input px-4 py-3 outline-none focus:ring-2 ring-ring" />
        </Field>
        <Field label="Slogan (opcional)">
          <input value={slogan} onChange={(e) => setSlogan(e.target.value)} placeholder="Gracias por acompañarnos"
            className="w-full rounded-lg border border-border bg-input px-4 py-3 outline-none focus:ring-2 ring-ring" />
        </Field>

        <Field label="Logo">
          <div className="flex flex-wrap items-center gap-3">
            <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
              className="rounded-lg border border-border px-4 py-2 text-sm font-bold uppercase tracking-widest hover:bg-accent disabled:opacity-50">
              {uploading ? "Subiendo…" : logo ? "Cambiar logo" : "Subir logo"}
            </button>
            {logo && (
              <button type="button" onClick={removeLogo}
                className="rounded-lg border border-destructive px-4 py-2 text-sm font-bold uppercase tracking-widest text-destructive hover:bg-destructive hover:text-destructive-foreground">
                Quitar
              </button>
            )}
            <span className="text-xs text-muted-foreground">PNG / JPG · máx. 5 MB</span>
          </div>
        </Field>

        {logo && (
          <div className="rounded-lg border border-border bg-background p-3">
            <div className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Vista previa</div>
            <img src={logo} alt="logo preview" className="max-h-24" />
          </div>
        )}

        <button disabled={busy} onClick={save}
          className="w-full rounded-lg bg-primary py-4 font-bold uppercase tracking-widest text-primary-foreground disabled:opacity-50">
          {busy ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs uppercase tracking-widest text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
