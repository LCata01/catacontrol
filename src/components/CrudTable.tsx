import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";

export type Field = {
  key: string;
  label: string;
  type?: "text" | "number" | "select" | "checkbox" | "date" | "time";
  options?: { value: string; label: string }[];
  /** Load select options dynamically from a Supabase table. */
  optionsFrom?: { table: string; valueColumn?: string; labelColumn?: string; activeOnly?: boolean };
  required?: boolean;
  readonly?: boolean;
};

export function CrudTable({
  table, title, fields, defaults = {}, orderBy = "name",
}: {
  table: string; title: string; fields: Field[];
  defaults?: Record<string, any>; orderBy?: string;
}) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["crud", table],
    queryFn: async () => {
      const { data, error } = await supabase.from(table as any).select("*").order(orderBy);
      if (error) throw error; return data ?? [];
    },
  });

  const [editing, setEditing] = useState<any | null>(null);
  const [creating, setCreating] = useState(false);

  const save = async (row: any) => {
    const payload = { ...row };
    delete payload.id; delete payload.created_at;
    fields.filter(f => f.readonly).forEach(f => { delete payload[f.key]; });
    if (editing?.id) {
      const { error } = await supabase.from(table as any).update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Guardado");
    } else {
      const { error } = await supabase.from(table as any).insert(payload);
      if (error) return toast.error(error.message);
      toast.success("Creado");
    }
    setEditing(null); setCreating(false);
    qc.invalidateQueries({ queryKey: ["crud", table] });
  };

  const remove = async (id: string) => {
    if (!confirm("¿Eliminar este registro?")) return;
    const { error } = await supabase.from(table as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["crud", table] });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black uppercase">{title}</h2>
        <button onClick={() => { setEditing({ ...defaults }); setCreating(true); }}
          className="rounded-md bg-primary px-4 py-2 text-sm font-bold uppercase tracking-widest text-primary-foreground">+ Nuevo</button>
      </div>
      <div className="overflow-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs uppercase tracking-widest text-muted-foreground">
            <tr>{fields.map(f => <th key={f.key} className="px-4 py-3">{f.label}</th>)}<th className="px-4 py-3 text-right">Acciones</th></tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={fields.length + 1} className="p-6 text-center text-muted-foreground">Cargando…</td></tr>}
            {data?.map((row: any) => (
              <tr key={row.id} className="border-t border-border">
                {fields.map(f => <td key={f.key} className="px-4 py-3">{renderCell(row[f.key], f)}</td>)}
                <td className="px-4 py-3 text-right">
                  <button onClick={() => { setEditing(row); setCreating(false); }} className="mr-2 rounded border border-border px-3 py-1 text-xs">Editar</button>
                  <button onClick={() => remove(row.id)} className="rounded border border-destructive px-3 py-1 text-xs text-destructive">Eliminar</button>
                </td></tr>))}</tbody></table></div>

      {(editing !== null) && (
        <Editor row={editing} fields={fields} title={creating ? `Nuevo ${title}` : `Editar ${title}`}
          onCancel={() => { setEditing(null); setCreating(false); }} onSave={save} />
      )}
    </div>
  );
}

function renderCell(v: any, f: Field) {
  if (f.type === "checkbox") return v ? "✓" : "—";
  if (v === null || v === undefined || v === "") return "—";
  if (f.type === "date") {
    // v comes as YYYY-MM-DD from Postgres; render as DD/MM/YYYY
    const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : String(v);
  }
  if (f.type === "time") {
    const m = String(v).match(/^(\d{2}):(\d{2})/);
    return m ? `${m[1]}:${m[2]}` : String(v);
  }
  if (typeof v === "boolean") return v ? "✓" : "—";
  return String(v);
}

function Editor({ row, fields, title, onCancel, onSave }: {
  row: any; fields: Field[]; title: string; onCancel: () => void; onSave: (r: any) => void;
}) {
  const [val, setVal] = useState<any>(row);
  const update = (k: string, v: any) => setVal((p: any) => ({ ...p, [k]: v }));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-bold">{title}</h3>
          <button onClick={onCancel} className="text-2xl text-muted-foreground">×</button>
        </div>
        <div className="space-y-3">
          {fields.map(f => (
            <div key={f.key}>
              <label className="mb-1 block text-xs uppercase tracking-widest text-muted-foreground">{f.label}</label>
              {f.readonly ? (
                <div className="w-full rounded-lg border border-border bg-muted px-3 py-2.5 text-muted-foreground">
                  {val[f.key] ?? "— (se genera automáticamente)"}
                </div>
              ) : f.type === "select" ? (
                <DynamicSelect field={f} value={val[f.key] ?? ""} onChange={(v) => update(f.key, v)} />
              ) : f.type === "checkbox" ? (
                <label className="flex items-center gap-2"><input type="checkbox" checked={!!val[f.key]} onChange={(e) => update(f.key, e.target.checked)} /> {f.label}</label>
              ) : f.type === "date" || f.type === "time" ? (
                <input type={f.type} value={val[f.key] ?? ""}
                  onChange={(e) => update(f.key, e.target.value || null)}
                  className="w-full rounded-lg border border-border bg-input px-3 py-2.5" />
              ) : (
                <input type={f.type === "number" ? "number" : "text"} value={val[f.key] ?? ""}
                  onChange={(e) => update(f.key, f.type === "number" ? (e.target.value === "" ? null : Number(e.target.value)) : e.target.value)}
                  className="w-full rounded-lg border border-border bg-input px-3 py-2.5" />
              )}
            </div>
          ))}
        </div>
        <button onClick={() => onSave(val)}
          className="mt-6 w-full rounded-lg bg-primary py-3 font-bold uppercase tracking-widest text-primary-foreground">Guardar</button>
      </div>
    </div>
  );
}

function DynamicSelect({ field, value, onChange }: {
  field: Field; value: string; onChange: (v: string) => void;
}) {
  const qc = useQueryClient();
  const from = field.optionsFrom;
  const { data: dyn } = useQuery({
    queryKey: ["dyn-options", from?.table],
    enabled: !!from,
    queryFn: async () => {
      let q: any = supabase.from(from!.table as any).select("*").order(from!.labelColumn ?? "name");
      if (from!.activeOnly !== false) q = q.eq("active", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        value: String(r[from!.valueColumn ?? "name"]),
        label: String(r[from!.labelColumn ?? "name"]),
      }));
    },
  });

  const opts = from ? (dyn ?? []) : (field.options ?? []);

  const createNew = async () => {
    if (!from) return;
    const name = window.prompt(`Nueva opción para ${field.label}:`)?.trim();
    if (!name) return;
    const { error } = await supabase.from(from.table as any).insert({ name, active: true } as any);
    if (error) { toast.error(error.message); return; }
    await qc.invalidateQueries({ queryKey: ["dyn-options", from.table] });
    await qc.invalidateQueries({ queryKey: ["crud", from.table] });
    onChange(name);
    toast.success("Opción creada");
  };

  return (
    <div className="flex gap-2">
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-input px-3 py-2.5">
        <option value="">—</option>
        {opts.map((o: { value: string; label: string }) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {from && (
        <button type="button" onClick={createNew}
          className="rounded-lg border border-border bg-card px-3 py-2.5 text-sm font-bold uppercase tracking-widest hover:bg-accent">+</button>
      )}
    </div>
  );
}
