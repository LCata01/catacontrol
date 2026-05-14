import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { connectQz, listPrinters, getSavedPrinter, setSavedPrinter, printRaw } from "@/lib/qz";
import { toast } from "sonner";
import { Printer, Loader2 } from "lucide-react";

export function PrinterSettingsButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Configurar impresora"
        className="rounded-md border border-border px-3 py-2 text-sm hover:bg-accent inline-flex items-center gap-2"
      >
        <Printer className="h-4 w-4" />
        Impresora
      </button>
      <PrinterSettingsDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

export function PrinterSettingsDialog({
  open, onOpenChange,
}: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [loading, setLoading] = useState(false);
  const [printers, setPrinters] = useState<string[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelected(getSavedPrinter() ?? "");
    setPrinters([]);
    setConnected(false);
  }, [open]);

  const refresh = async () => {
    setLoading(true);
    try {
      await connectQz();
      setConnected(true);
      const list = await listPrinters();
      setPrinters(list);
      if (!selected && list.length) setSelected(list[0]);
    } catch (e: any) {
      toast.error("No se pudo conectar a QZ Tray. ¿Está instalado y abierto?");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const save = () => {
    setSavedPrinter(selected || null);
    toast.success(selected ? `Impresora: ${selected}` : "Impresora desconfigurada");
    onOpenChange(false);
  };

  const test = async () => {
    if (!selected) return;
    setSavedPrinter(selected);
    setLoading(true);
    try {
      const ESC = "\x1B", GS = "\x1D";
      const data =
        ESC + "@" +
        ESC + "a" + "\x01" +
        GS + "!" + "\x11" + "PRUEBA QZ TRAY\n" + GS + "!" + "\x00" +
        "Impresora: " + selected + "\n" +
        new Date().toLocaleString("es-AR") + "\n\n\n" +
        GS + "V" + "B" + "\x03";
      await printRaw([{ type: "raw", format: "plain", data }]);
      toast.success("Prueba enviada");
    } catch (e: any) {
      toast.error(e?.message ?? "Error de impresión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configurar impresora (QZ Tray)</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            Esta terminal imprime mediante QZ Tray para usar el autocutter del hardware.
            Asegurate de tener QZ Tray instalado y ejecutándose en esta computadora
            (<a href="https://qz.io/download/" target="_blank" rel="noreferrer" className="underline">qz.io/download</a>).
          </p>

          <div className="flex items-center gap-2">
            <Button onClick={refresh} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Conectar y listar impresoras"}
            </Button>
            {connected && <span className="text-xs text-emerald-500">Conectado</span>}
          </div>

          {printers.length > 0 && (
            <div className="space-y-2">
              <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Impresora
              </label>
              <select
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2"
              >
                {printers.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          )}

          {selected && (
            <div className="rounded-md border border-border p-3 text-xs">
              Actual: <span className="font-mono">{selected}</span>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={test} disabled={!selected || loading}>
            Imprimir prueba
          </Button>
          <Button onClick={save} disabled={!selected}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
