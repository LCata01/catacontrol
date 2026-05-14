import { useState } from "react";
import { Printer, Scissors, CircleSlash } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getActivePrinter } from "@/lib/print";
import { PrinterSetup } from "./PrinterSetup";

export function PrinterStatus({
  tenantId,
  tenantName,
  terminalId,
  terminalName,
  userId,
}: {
  tenantId: string | null | undefined;
  tenantName: string;
  terminalId: string | null | undefined;
  terminalName: string;
  userId: string | null | undefined;
}) {
  const [open, setOpen] = useState(false);
  // Re-read on each render so state updates after change propagate.
  const active = getActivePrinter();

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Cambiar impresora"
        className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs hover:bg-accent"
      >
        <Printer className="h-4 w-4 text-primary" />
        <span className="hidden sm:inline font-bold uppercase tracking-widest">
          {active?.name ?? "Sin impresora"}
        </span>
        {active?.cutter && active.cutter !== "none" ? (
          <Scissors className="h-3.5 w-3.5 text-success" />
        ) : (
          <CircleSlash className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Cambiar impresora</DialogTitle>
          </DialogHeader>
          <PrinterSetup
            tenantId={tenantId}
            tenantName={tenantName}
            terminalId={terminalId}
            terminalName={terminalName}
            userId={userId}
            onReady={() => setOpen(false)}
            onCancel={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
