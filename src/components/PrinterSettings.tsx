import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { testPrint } from "@/lib/printer";
import { Printer } from "lucide-react";

export function PrinterSettingsButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Impresora"
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
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Impresión desde el navegador</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            Los tickets se imprimen usando el diálogo de impresión del navegador.
            La primera vez, elegí tu impresora térmica y activá <span className="font-bold">"Recordar"</span>{" "}
            o configurala como predeterminada del sistema.
          </p>
          <p>
            Para impresión silenciosa (sin diálogo), abrí Chrome con el flag{" "}
            <code className="font-mono">--kiosk-printing</code> y la impresora térmica como predeterminada.
          </p>
          <p>Tamaño de papel recomendado: 80mm.</p>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => testPrint()}>
            Imprimir prueba
          </Button>
          <Button onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
