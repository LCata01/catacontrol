# CATA PRINT SERVICE

Servicio local de impresión térmica ESC/POS para CATA CONTROL. Reemplaza completamente a QZ Tray.

- 100% nativo (Electron + Node.js)
- Corre en segundo plano con icono de bandeja del sistema
- Arranca automáticamente con Windows
- Servidor WebSocket en `ws://localhost:47822`
- Imprime silenciosamente, sin diálogos
- Detecta impresoras térmicas instaladas
- Soporta texto, QR, código de barras, logo, corte, cajón y beep
- Autenticación por API Key + filtrado de orígenes

## Requisitos

- Windows 10/11 (instalador `.exe`). Mac (`.dmg`) preparado en build.
- Node.js 18+ y `npm` para compilar desde fuente.

## Instalación

```bash
cd cata-print-service
npm install
npm run dist:win    # genera release/CATA PRINT SERVICE Setup x.x.x.exe
```

El instalador NSIS:
- Crea acceso directo en escritorio.
- Crea entrada en menú inicio.
- Permite desinstalar desde Panel de Control.
- Configura arranque automático con Windows.

> Antes de generar el instalador final reemplazá `assets/icon.ico` (256x256) y `assets/tray.ico` por el branding definitivo.

## Desarrollo

```bash
npm install
npm run start
```

Logs: `%APPDATA%/CATA PRINT SERVICE/logs/service.log`
Config: `%APPDATA%/CATA PRINT SERVICE/config.json`

## Protocolo WebSocket

Endpoint: `ws://localhost:47822/?key=<API_KEY>`

La API Key se genera automáticamente en el primer arranque y se muestra en la ventana de configuración. Copialo y guardalo en CATA CONTROL como secret `CATA_PRINT_API_KEY`.

### Acciones

```jsonc
// Imprimir ticket
{
  "action": "print_ticket",
  "printer": "XP-80",       // opcional, usa la default si se omite
  "copies": 1,
  "cut": true,
  "openDrawer": false,
  "payload": {
    "align": "left",
    "text": [
      "CATA CONTROL",
      "BARRA 1",
      "--------------------------------",
      "FERNET x2          $24000",
      "--------------------------------",
      "TOTAL:             $24000"
    ],
    "qr": "https://catacontrol.app/t/123",   // opcional
    "barcode": "123456789012",               // opcional (EAN13)
    "logoBase64": "iVBORw0KGgoAAAA..."      // opcional, PNG
  }
}

// Otras acciones
{ "action": "open_drawer" }
{ "action": "test_print" }
{ "action": "beep" }
{ "action": "get_printers" }
{ "action": "get_status" }
```

Respuesta:

```json
{ "ok": true, "action": "print_ticket" }
{ "ok": false, "action": "print_ticket", "error": "Impresora desconectada o sin papel" }
```

## Seguridad

- Bind exclusivo a `127.0.0.1` (no acepta conexiones de red).
- Validación de `Origin` contra lista blanca: `catacontrol.app`, `localhost`, `*.base44.app`.
- API Key obligatoria por query string `?key=` o header `X-API-Key`.
- Conexiones no-locales son rechazadas con `403`.

## Integración frontend (ejemplo)

Reemplazá tu cliente actual de QZ Tray con esto:

```ts
// src/lib/cata-print.ts
type PrintTicketArgs = {
  printer?: string;
  copies?: number;
  cut?: boolean;
  openDrawer?: boolean;
  payload: {
    text?: string[];
    align?: "left" | "center" | "right";
    qr?: string;
    barcode?: string;
    logoBase64?: string;
  };
};

const ENDPOINT = "ws://localhost:47822";
const API_KEY = import.meta.env.VITE_CATA_PRINT_API_KEY ?? "";

let socket: WebSocket | null = null;
let queue: Array<{ msg: any; resolve: (v: any) => void; reject: (e: any) => void }> = [];
let reconnectTimer: any = null;

function connect(): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    if (socket && socket.readyState === WebSocket.OPEN) return resolve(socket);
    const ws = new WebSocket(`${ENDPOINT}/?key=${encodeURIComponent(API_KEY)}`);
    ws.onopen = () => { socket = ws; resolve(ws); };
    ws.onerror = (e) => reject(e);
    ws.onclose = () => {
      socket = null;
      if (!reconnectTimer) reconnectTimer = setTimeout(() => { reconnectTimer = null; connect().catch(() => {}); }, 2000);
    };
    ws.onmessage = (ev) => {
      const data = JSON.parse(ev.data);
      const job = queue.shift();
      if (!job) return;
      data.ok ? job.resolve(data) : job.reject(new Error(data.error || "Error"));
    };
  });
}

async function send(msg: any) {
  const ws = await connect();
  return new Promise((resolve, reject) => {
    queue.push({ msg, resolve, reject });
    ws.send(JSON.stringify(msg));
  });
}

export const cataPrint = {
  printTicket: (args: PrintTicketArgs) => send({ action: "print_ticket", ...args }),
  openDrawer: () => send({ action: "open_drawer" }),
  testPrint: () => send({ action: "test_print" }),
  getPrinters: () => send({ action: "get_printers" }),
  getStatus: () => send({ action: "get_status" }),
  beep: () => send({ action: "beep" }),
};
```

Uso:

```ts
import { cataPrint } from "@/lib/cata-print";

await cataPrint.printTicket({
  copies: 1,
  cut: true,
  payload: {
    text: [
      "CATA CONTROL",
      "BARRA 1",
      "--------------------------------",
      "FERNET x2          $24000",
      "--------------------------------",
      "TOTAL:             $24000",
    ],
  },
});
```

## Logging

El servicio guarda eventos rotados (5MB x 5 archivos) en:

- `%APPDATA%/CATA PRINT SERVICE/logs/service.log`

Eventos registrados:
- Inicio / parada del servidor
- Conexiones aceptadas y rechazadas (con motivo)
- Impresiones exitosas (impresora, copias)
- Impresora desconectada o sin papel
- Errores de comunicación

## Roadmap

- macOS: el código ya soporta Mac. Para distribuir, agregá `assets/icon.icns` y corré `npm run dist:mac` desde una máquina macOS.
- Firma de código (Authenticode/Apple Developer ID) para producción.
