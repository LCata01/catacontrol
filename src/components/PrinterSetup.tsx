import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Printer, RefreshCw, Scissors, CircleSlash, CheckCircle2, BellOff } from "lucide-react";
import {
  getPrintService,
  getLastPrinter,
  setLastPrinter,
  setActivePrinter,
  type PrinterInfo,
  type PrinterCapabilities,
} from "@/lib/print";
import { printTestTo } from "@/lib/printer";

export function PrinterSetup({
  tenantId,
  tenantName,
  terminalId,
  terminalName,
  userId,
  onReady,
  onCancel,
}: {
  tenantId: string | null | undefined;
  tenantName: string;
  terminalId: string | null | undefined;
  terminalName: string;
  userId: string | null | undefined;
  /** Called once a printer is selected AND test print succeeds. */
  onReady: () => void;
  onCancel?: () => void;
}) {
  const [printers, setPrinters] = useState<PrinterInfo[] | null>(null);
  const [selected, setSelected] = useState<string>("");
  const [caps, setCaps] = useState<PrinterCapabilities | null>(null);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testedFor, setTestedFor] = useState<string | null>(null);
  const [agentError, setAgentError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setAgentError(null);
    try {
      const svc = getPrintService();
      await svc.connect();
      const list = await svc.listPrinters();
      setPrinters(list);
      const last = getLastPrinter({ tenantId, terminalId, userId });
      const preselect =
        list.find((p) => p.name === last)?.name ?? list[0]?.name ?? "";
      setSelected(preselect);
      // If we already had this printer last session, do not require a new test.
      if (last && preselect === last) setTestedFor(last);
    } catch (e: any) {
      setPrinters([]);
      setAgentError(
        e?.message ??
          "No se pudo conectar con el agente de impresión local.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selected) { setCaps(null); return; }
    let cancelled = false;
    getPrintService()
      .getCapabilities(selected)
      .then((c) => { if (!cancelled) setCaps(c); })
      .catch(() => { if (!cancelled) setCaps({ autoCutter: "none", raw: false }); });
    return () => { cancelled = true; };
  }, [selected]);

  const onSelect = (name: string) => {
    setSelected(name);
    setTestedFor(null);
  };

  const runTest = async () => {
    if (!selected) return;
    setTesting(true);
    try {
      await printTestTo(selected, { tenantName, terminalName });
      setTestedFor(selected);
      toast.success("Prueba enviada a la impresora");
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo imprimir. Verifique la impresora.");
    } finally {
      setTesting(false);
    }
  };

  const confirm = () => {
    if (!selected || testedFor !== selected || !caps) return;
    setLastPrinter({ tenantId, terminalId, userId }, selected);
    setActivePrinter({ name: selected, cutter: caps.autoCutter });
    onReady();
  };

  const bypass = () => {
    const ok = window.confirm(
      "¿Continuar SIN impresora?\n\nNo se imprimirán tickets en esta sesión (ventas, staff, cierre de turno). Las ventas se siguen registrando normalmente.",
    );
    if (!ok) return;
    setActivePrinter({ name: "(sin impresora)", cutter: "none", bypass: true });
    toast.message("Modo sin impresión activado", {
      description: "No se imprimirán tickets en esta sesión.",
    });
    onReady();
  };

  const canConfirm = !!selected && testedFor === selected && !!caps;

  return (
    <div className="mx-auto mt-12 max-w-xl rounded-2xl border border-border bg-card p-8">
      <div className="flex items-center gap-3">
        <Printer className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-2xl font-bold">Seleccionar impresora</h2>
          <p className="text-sm text-muted-foreground">
            {terminalName} · Antes de abrir el turno
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-border bg-background p-3 text-xs text-muted-foreground">
        Los tickets se imprimen mediante el diálogo nativo del navegador (sin auto-cutter).
      </div>

      {agentError && (
        <div className="mt-6 rounded-lg border border-destructive bg-destructive/10 p-4 text-sm">
          <div className="font-bold text-destructive">No se pudieron listar impresoras</div>
          <p className="mt-1 text-muted-foreground">{agentError}</p>
        </div>
      )}

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <label className="text-xs uppercase tracking-widest text-muted-foreground">
            Impresoras detectadas
          </label>
          <button
            onClick={refresh}
            disabled={loading}
            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-accent disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </button>
        </div>
        <select
          value={selected}
          onChange={(e) => onSelect(e.target.value)}
          disabled={loading || !printers?.length}
          className="w-full rounded-lg border border-border bg-input px-4 py-3 text-base outline-none focus:ring-2 ring-ring disabled:opacity-50"
        >
          {!printers?.length && <option value="">Sin impresoras detectadas</option>}
          {printers?.map((p) => (
            <option key={p.name} value={p.name}>{p.name}</option>
          ))}
        </select>
      </div>

      {selected && caps && (
        <div className="mt-4 rounded-lg border border-border bg-background p-3 text-sm">
          <div className="flex items-center gap-2 font-bold">
            <Printer className="h-4 w-4" /> {selected}
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            {caps.autoCutter === "none" ? (
              <><CircleSlash className="h-3.5 w-3.5" /> Auto cutter: no soportado</>
            ) : (
              <><Scissors className="h-3.5 w-3.5" /> Auto cutter: activo ({caps.autoCutter})</>
            )}
          </div>
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3">
        <button
          onClick={runTest}
          disabled={!selected || testing}
          className="rounded-lg border border-primary bg-card px-4 py-4 text-sm font-bold uppercase tracking-widest text-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
        >
          {testing ? "Imprimiendo…" : "Imprimir prueba"}
        </button>
        <button
          onClick={confirm}
          disabled={!canConfirm}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-success px-4 py-4 text-sm font-bold uppercase tracking-widest text-success-foreground disabled:opacity-50"
        >
          {testedFor === selected && <CheckCircle2 className="h-4 w-4" />}
          Continuar
        </button>
      </div>

      {testedFor !== selected && selected && (
        <p className="mt-3 text-xs text-muted-foreground">
          Debe completar una prueba exitosa antes de abrir el turno.
        </p>
      )}

      <div className="mt-6 border-t border-border pt-4">
        <button
          onClick={bypass}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <BellOff className="h-4 w-4" />
          Continuar sin impresora
        </button>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          No se imprimirán tickets en esta sesión.
        </p>
      </div>

      {onCancel && (
        <div className="mt-4 text-center">
          <button onClick={onCancel} className="text-xs text-muted-foreground hover:underline">
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}
