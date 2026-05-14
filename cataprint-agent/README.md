# CATAPRINT — Local Print Agent

Reemplaza QZ Tray. Servicio HTTP local que CATACONTROL consume desde el navegador
para detectar e imprimir en impresoras del sistema operativo.

```
Browser (CATACONTROL) ──HTTP──▶  CATAPRINT (localhost:9100)  ──OS──▶  Printer
```

## Endpoints

| Método | Ruta                              | Descripción                                     |
|--------|-----------------------------------|-------------------------------------------------|
| GET    | `/health`                         | Ping. Devuelve versión y plataforma.            |
| GET    | `/printers`                       | Lista impresoras del sistema.                   |
| GET    | `/printers/:name/capabilities`    | Detecta auto-cutter (heurístico por nombre).    |
| POST   | `/print`                          | Imprime HTML o RAW (ESC/POS).                   |
| POST   | `/print/test`                     | Imprime ticket de prueba.                       |

### POST /print body

```json
{
  "printer": "EPSON TM-T20",
  "html": "<html>...</html>",
  "raw": "<base64>",       // opcional, alternativo a html
  "title": "Ticket #123",
  "copies": 1,
  "cut": true              // false para suprimir corte
}
```

## Desarrollo

```bash
cd cataprint-agent
npm install
npm start          # http://127.0.0.1:9100
```

## Empaquetado para distribución

Usa [`pkg`](https://github.com/vercel/pkg) para generar binarios standalone.

```bash
npm run package:win     # cataprint-win.exe
npm run package:mac     # cataprint-mac
npm run package:linux   # cataprint-linux
```

> **Nota Puppeteer:** `pkg` no empaqueta el binario de Chromium. Para
> distribución real, en lugar de `pkg` se recomienda **electron-builder**
> con `electron` como host, o instalar Chrome/Chromium en cada PC y
> apuntar `PUPPETEER_EXECUTABLE_PATH`. Para prueba interna, `pkg`
> alcanza si Chromium queda en el `node_modules` distribuido.

## Plataformas

| OS       | Listado de impresoras            | Impresión HTML/PDF             | RAW (ESC/POS)             |
|----------|----------------------------------|--------------------------------|---------------------------|
| Windows  | `pdf-to-printer` (WMI)           | `pdf-to-printer` + Sumatra     | PowerShell `Out-Printer`  |
| macOS    | `pdf-to-printer` (lpstat)        | `lp` (CUPS)                    | `lp -o raw`               |
| Linux    | `lpstat -p` (CUPS)               | `lp` (CUPS)                    | `lp -o raw`               |

## Variables de entorno

- `CATAPRINT_PORT` — Puerto del servicio (default `9100`).
- `PUPPETEER_EXECUTABLE_PATH` — Ruta a Chrome/Chromium si no se distribuye con el binario.

## Auto-arranque

- **Windows:** Crear acceso directo a `cataprint-win.exe` en `shell:startup`, o registrar como servicio con [`nssm`](https://nssm.cc/).
- **macOS:** `launchd` plist en `~/Library/LaunchAgents/`.
- **Linux:** `systemd --user` unit.

## Migración desde QZ Tray

CATACONTROL detecta CATAPRINT automáticamente. Si CATAPRINT responde en
`http://127.0.0.1:9100/health`, lo usa. Si no, hace fallback a QZ Tray
durante el período de compatibilidad.

Para forzar manualmente el driver, en la consola del navegador:

```js
localStorage.setItem("cata_print_driver", "cataprint"); // o "qz" o "auto"
location.reload();
```
