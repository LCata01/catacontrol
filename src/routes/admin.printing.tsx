import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  connectQz,
  listPrinters,
  getSavedPrinter,
  setSavedPrinter,
  printRaw,
  isQzConnected,
  disconnectQz,
  clearQzCache,
} from "@/lib/qz";
import { getQzCertificateInfo } from "@/lib/qz-sign.functions";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin/printing")({ component: PrintingPage });

function PrintingPage() {
  const getInfo = useServerFn(getQzCertificateInfo);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [printers, setPrinters] = useState<string[]>([]);
  const [selected, setSelected] = useState<string>(getSavedPrinter() ?? "");
  const [certInfo, setCertInfo] = useState<any>(null);

  const refreshStatus = async () => {
    setConnected(await isQzConnected());
  };

  const loadCert = async () => {
    try {
      const info = await getInfo();
      setCertInfo(info);
    } catch (e: any) {
      toast.error(e.message ?? "Error al leer certificado");
    }
  };

  useEffect(() => {
    refreshStatus();
    loadCert();
    const i = setInterval(refreshStatus, 4000);
    return () => clearInterval(i);
  }, []);

  const connect = async () => {
    setLoading(true);
    try {
      await connectQz();
      const list = await listPrinters();
      setPrinters(list);
      if (!selected && list.length) setSelected(list[0]);
      setConnected(true);
      toast.success("Conectado a QZ Tray");
    } catch (e: any) {
      toast.error(e.message ?? "QZ Tray no detectado. Inicie QZ Tray para imprimir.");
    } finally {
      setLoading(false);
    }
  };

  const save = () => {
    setSavedPrinter(selected || null);
    toast.success(selected ? `Impresora: ${selected}` : "Impresora desconfigurada");
  };

  const test = async () => {
    if (!selected) return toast.error("Seleccioná una impresora");
    setSavedPrinter(selected);
    setLoading(true);
    try {
      const ESC = "\x1B", GS = "\x1D";
      const data =
        ESC + "@" +
        ESC + "a" + "\x01" +
        GS + "!" + "\x11" + "PRUEBA QZ TRAY\n" + GS + "!" + "\x00" +
        "Impresora: " + selected + "\n" +
        new Date().toLocaleString("es-AR") + "\n" +
        (certInfo?.configured ? "Firmado: SI\n" : "Firmado: NO\n") +
        "\n\n\n" +
        GS + "V" + "B" + "\x03";
      await printRaw([{ type: "raw", format: "plain", data }]);
      toast.success("Prueba enviada");
    } catch (e: any) {
      toast.error(e?.message ?? "Error de impresión");
    } finally {
      setLoading(false);
    }
  };

  const regenerate = async () => {
    setLoading(true);
    try {
      await disconnectQz();
      clearQzCache();
      await loadCert();
      await refreshStatus();
      toast.success("Configuración regenerada. Reconectando...");
    } finally {
      setLoading(false);
    }
  };

  const dom = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-black uppercase">Impresión (QZ Tray)</h2>

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Estado</div>
        <div className="flex items-center gap-3">
          <span className={`h-3 w-3 rounded-full ${connected ? "bg-emerald-500" : "bg-destructive"}`} />
          <span className="font-bold">
            {connected ? "Conectado a QZ Tray" : "QZ Tray no detectado. Inicie QZ Tray para imprimir."}
          </span>
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={connect} disabled={loading}
            className="rounded-md border border-border px-4 py-2 text-sm hover:bg-accent inline-flex items-center gap-2">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Conectar / Refrescar
          </button>
          <button onClick={regenerate} disabled={loading}
            className="rounded-md border border-border px-4 py-2 text-sm hover:bg-accent">
            Regenerar configuración
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Certificado activo</div>
        {!certInfo ? (
          <div className="text-sm text-muted-foreground">Cargando…</div>
        ) : !certInfo.configured ? (
          <div className="space-y-2 text-sm">
            <div className="font-bold text-amber-500">Sin certificado configurado.</div>
            <p className="text-muted-foreground">
              Cargá los secrets <code className="font-mono">QZ_CERTIFICATE</code> y{" "}
              <code className="font-mono">QZ_PRIVATE_KEY</code>. Sin ellos, QZ Tray pedirá autorización en cada impresión.
            </p>
          </div>
        ) : certInfo.error ? (
          <div className="text-sm text-destructive">Error: {certInfo.error}</div>
        ) : (
          <div className="grid gap-1.5 text-sm">
            <Row k="Sujeto" v={certInfo.info.subject} />
            <Row k="Emisor" v={certInfo.info.issuer} />
            <Row k="Válido desde" v={certInfo.info.validFrom} />
            <Row k="Válido hasta" v={certInfo.info.validTo} />
            <Row k="Huella SHA-256" v={certInfo.info.fingerprint} mono />
            <Row k="Clave privada" v={certInfo.hasKey ? "Configurada" : "FALTA"} />
            <Row k="Dominio confiable" v={dom} mono />
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-3 text-xs uppercase tracking-widest text-muted-foreground">Impresora</div>
        {printers.length === 0 ? (
          <div className="text-sm text-muted-foreground">Conectá QZ Tray para listar impresoras.</div>
        ) : (
          <select value={selected} onChange={(e) => setSelected(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2">
            {printers.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        )}
        {selected && (
          <div className="mt-2 text-xs text-muted-foreground">Actual: <span className="font-mono">{selected}</span></div>
        )}
        <div className="mt-4 flex gap-2">
          <button onClick={test} disabled={!selected || loading}
            className="rounded-md border border-border px-4 py-2 text-sm hover:bg-accent">
            Probar impresión
          </button>
          <button onClick={save} disabled={!selected}
            className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90">
            Guardar
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 text-sm">
        <div className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Instalación del certificado en QZ Tray</div>
        <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
          <li>Instalá QZ Tray en cada terminal: <a className="underline" href="https://qz.io/download/" target="_blank" rel="noreferrer">qz.io/download</a>.</li>
          <li>Copiá el contenido de <code className="font-mono">QZ_CERTIFICATE</code> en <code className="font-mono">override.crt</code> dentro de la carpeta de QZ Tray (Windows: <code className="font-mono">C:\Program Files\QZ Tray\auth\</code>; macOS: <code className="font-mono">/Applications/QZ Tray.app/Contents/Resources/auth/</code>).</li>
          <li>Reiniciá QZ Tray. Las impresiones desde <code className="font-mono">{dom}</code> dejarán de pedir autorización.</li>
        </ol>
      </div>
    </div>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex flex-wrap justify-between gap-2 border-b border-border py-1.5">
      <span className="text-muted-foreground">{k}</span>
      <span className={mono ? "font-mono text-xs break-all" : ""}>{v}</span>
    </div>
  );
}
