import { createFileRoute } from "@tanstack/react-router";
import { testPrint } from "@/lib/printer";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/printing")({ component: PrintingPage });

function PrintingPage() {
  const test = () => {
    try {
      testPrint();
      toast.success("Diálogo de impresión abierto");
    } catch (e: any) {
      toast.error(e?.message ?? "Error de impresión");
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-black uppercase">Impresión</h2>

      <div className="rounded-xl border border-border bg-card p-6 space-y-3 text-sm">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Modo</div>
        <div className="font-bold">Impresión desde el navegador</div>
        <p className="text-muted-foreground">
          Los tickets se imprimen mediante el diálogo nativo de impresión del navegador. No se requiere
          ningún software adicional instalado en la terminal.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 space-y-2 text-sm">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Configuración recomendada</div>
        <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
          <li>Conectá la impresora térmica e instalá su driver en el sistema.</li>
          <li>Marcala como impresora predeterminada del sistema operativo.</li>
          <li>Tamaño de papel: <span className="font-mono">80mm</span> (o 58mm según tu modelo).</li>
          <li>
            Para imprimir sin diálogo (modo kiosko), iniciá el navegador con{" "}
            <code className="font-mono">--kiosk-printing</code>.
          </li>
        </ol>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <button
          onClick={test}
          className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90"
        >
          Imprimir prueba
        </button>
      </div>
    </div>
  );
}
