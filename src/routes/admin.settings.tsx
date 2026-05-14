import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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

  useEffect(() => {
    if (!data) return;
    setName(data.nightclub_name ?? "");
    setSlogan(data.slogan ?? "");
    setLogo(data.logo_url ?? "");
  }, [data]);

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
    toast.success("Settings saved");
    qc.invalidateQueries({ queryKey: ["app-settings"] });
  };

  if (isLoading) return <div className="text-muted-foreground">Loading…</div>;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-black">Ticket Branding</h2>
        <p className="text-sm text-muted-foreground">Updates printed bar tickets instantly.</p>
      </div>

      <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <Field label="Nightclub name">
          <input value={name} onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-border bg-input px-4 py-3 outline-none focus:ring-2 ring-ring" />
        </Field>
        <Field label="Slogan (optional)">
          <input value={slogan} onChange={(e) => setSlogan(e.target.value)} placeholder="Gracias por acompañarnos"
            className="w-full rounded-lg border border-border bg-input px-4 py-3 outline-none focus:ring-2 ring-ring" />
        </Field>
        <Field label="Logo URL (optional)">
          <input value={logo} onChange={(e) => setLogo(e.target.value)} placeholder="https://…/logo.png"
            className="w-full rounded-lg border border-border bg-input px-4 py-3 outline-none focus:ring-2 ring-ring" />
        </Field>
        {logo && (
          <div className="rounded-lg border border-border bg-background p-3">
            <div className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Preview</div>
            <img src={logo} alt="logo preview" className="max-h-24" />
          </div>
        )}
        <button disabled={busy} onClick={save}
          className="w-full rounded-lg bg-primary py-4 font-bold uppercase tracking-widest text-primary-foreground disabled:opacity-50">
          Save
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
