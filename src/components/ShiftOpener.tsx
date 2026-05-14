import { useState } from "react";

export function ShiftOpener({
  title, onOpen, busy,
}: {
  title: string;
  onOpen: (initial: number) => void;
  busy?: boolean;
}) {
  const [v, setV] = useState("");
  return (
    <div className="mx-auto mt-16 max-w-md rounded-2xl border border-border bg-card p-8">
      <h2 className="text-2xl font-bold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">Ingrese el efectivo inicial para abrir el turno.</p>
      <div className="mt-6">
        <label className="mb-2 block text-xs uppercase tracking-widest text-muted-foreground">Efectivo Inicial</label>
        <input
          type="number" inputMode="decimal" value={v} onChange={(e) => setV(e.target.value)}
          className="w-full rounded-lg border border-border bg-input px-4 py-4 text-2xl outline-none focus:ring-2 ring-ring"
          placeholder="0"
        />
      </div>
      <button
        disabled={busy || v === ""}
        onClick={() => onOpen(Number(v))}
        className="mt-6 w-full rounded-lg bg-primary py-5 text-lg font-bold uppercase tracking-widest text-primary-foreground disabled:opacity-50"
      >Abrir Turno</button>
    </div>
  );
}
