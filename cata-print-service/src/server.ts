import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import { loadConfig, isOriginTrusted } from "./config";
import { getLogger } from "./logger";
import { printTicket, openDrawer, testPrint, getPrinters, beep, PrintJob } from "./printer";

let wss: WebSocketServer | null = null;

export type ServerStatus = {
  running: boolean;
  port: number;
  clients: number;
  apiKey: string;
};

export function getStatus(): ServerStatus {
  const cfg = loadConfig();
  return {
    running: !!wss,
    port: cfg.port,
    clients: wss ? wss.clients.size : 0,
    apiKey: cfg.apiKey,
  };
}

export function startServer(): void {
  if (wss) return;
  const cfg = loadConfig();
  const log = getLogger();

  wss = new WebSocketServer({
    host: "127.0.0.1", // localhost only — never bind to 0.0.0.0
    port: cfg.port,
    verifyClient: ({ origin, req }, done) => {
      const remote = req.socket.remoteAddress ?? "";
      const isLocal = remote === "127.0.0.1" || remote === "::1" || remote === "::ffff:127.0.0.1";
      if (!isLocal) {
        log.warn("Rechazada conexión no-local", { remote });
        return done(false, 403, "Forbidden");
      }
      if (origin && !isOriginTrusted(origin, cfg.trustedOrigins)) {
        log.warn("Origen no confiable", { origin });
        return done(false, 403, "Forbidden origin");
      }
      // API key check via query string (?key=...) or header
      const url = new URL(req.url ?? "/", "http://localhost");
      const key = url.searchParams.get("key") ?? req.headers["x-api-key"];
      if (key !== cfg.apiKey) {
        log.warn("API key inválida");
        return done(false, 401, "Unauthorized");
      }
      done(true);
    },
  });

  wss.on("listening", () => log.info(`WebSocket escuchando en ws://localhost:${cfg.port}`));
  wss.on("error", (err) => log.error("WS server error", { err: String(err) }));

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    log.info("Cliente conectado", { origin: req.headers.origin });
    ws.on("message", async (data) => {
      let job: PrintJob;
      try {
        job = JSON.parse(data.toString());
      } catch {
        ws.send(JSON.stringify({ ok: false, error: "JSON inválido" }));
        return;
      }
      try {
        const cfg = loadConfig();
        switch (job.action) {
          case "print_ticket":
            await printTicket(cfg, job);
            ws.send(JSON.stringify({ ok: true, action: job.action }));
            break;
          case "open_drawer":
            await openDrawer(cfg);
            ws.send(JSON.stringify({ ok: true, action: job.action }));
            break;
          case "test_print":
            await testPrint(cfg);
            ws.send(JSON.stringify({ ok: true, action: job.action }));
            break;
          case "beep":
            await beep(cfg);
            ws.send(JSON.stringify({ ok: true, action: job.action }));
            break;
          case "get_printers": {
            const list = await getPrinters();
            ws.send(JSON.stringify({ ok: true, action: job.action, printers: list }));
            break;
          }
          case "get_status":
            ws.send(JSON.stringify({ ok: true, action: job.action, status: getStatus() }));
            break;
          default:
            ws.send(JSON.stringify({ ok: false, error: "Acción desconocida" }));
        }
      } catch (e: any) {
        getLogger().error("Job falló", { action: job.action, err: e?.message });
        ws.send(JSON.stringify({ ok: false, action: job.action, error: e?.message ?? String(e) }));
      }
    });
    ws.on("close", () => log.info("Cliente desconectado"));
  });
}

export function stopServer(): Promise<void> {
  return new Promise((resolve) => {
    if (!wss) return resolve();
    wss.close(() => {
      wss = null;
      resolve();
    });
  });
}

export function restartServer(): void {
  stopServer().then(() => startServer());
}
