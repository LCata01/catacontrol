// CATAPRINT — local print agent for CATACONTROL.
// Express HTTP service exposing the same surface as QZ Tray:
//   GET  /health
//   GET  /printers
//   GET  /printers/:name/capabilities
//   POST /print            { printer, html?, raw?, title?, copies?, cut? }
//   POST /print/test       { printer, tenantName?, terminalName? }
//
// Replaces QZ Tray. CATACONTROL talks to it via http://localhost:9100.

const express = require("express");
// cors module no longer needed — manual middleware handles CORS + PNA.
const path = require("path");
const fs = require("fs");
const os = require("os");
const crypto = require("crypto");

const printers = require("./printers");
const printer = require("./print");

const PORT = parseInt(process.env.CATAPRINT_PORT || "9100", 10);
const VERSION = require("../package.json").version;

const app = express();

// CORS — allow any origin (the agent only listens on 127.0.0.1, so the
// attack surface is local). We must also opt-in to Chrome's Private Network
// Access (PNA): a public-origin HTTPS page (e.g. https://catacontrol.lovable.app)
// calling http://127.0.0.1 is blocked unless the preflight responds with
// Access-Control-Allow-Private-Network: true.
app.use((req, res, next) => {
  const origin = req.headers.origin || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    req.headers["access-control-request-headers"] || "Content-Type, Authorization",
  );
  res.setHeader("Access-Control-Allow-Private-Network", "true");
  res.setHeader("Private-Network-Access-Name", "cataprint");
  res.setHeader("Private-Network-Access-ID", "02:ca:7a:00:00:01");
  // Chrome PNA — required when a public site calls a private-network address.
  if (req.headers["access-control-request-private-network"]) {
    res.setHeader("Access-Control-Allow-Private-Network", "true");
  }
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Max-Age", "86400");
    return res.status(204).end();
  }
  next();
});
app.use(express.json({ limit: "5mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "cataprint", version: VERSION, platform: process.platform });
});

app.get("/printers", async (_req, res) => {
  try {
    const list = await printers.list();
    res.json({ printers: list });
  } catch (e) {
    res.status(500).json({ error: String(e?.message ?? e) });
  }
});

app.get("/printers/:name/capabilities", async (req, res) => {
  try {
    const caps = await printers.capabilities(req.params.name);
    res.json(caps);
  } catch (e) {
    res.status(500).json({ error: String(e?.message ?? e) });
  }
});

app.post("/print", async (req, res) => {
  try {
    const { printer: name, html, raw, title, copies, cut } = req.body ?? {};
    if (!name) return res.status(400).json({ error: "Missing 'printer'" });
    if (!html && !raw) return res.status(400).json({ error: "Missing 'html' or 'raw'" });
    await printer.print({ printer: name, html, raw, title, copies, cut });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e?.message ?? e) });
  }
});

app.post("/print/test", async (req, res) => {
  try {
    const { printer: name, tenantName, terminalName } = req.body ?? {};
    if (!name) return res.status(400).json({ error: "Missing 'printer'" });
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>
      @page { size: 80mm auto; margin: 0; }
      body { font-family: monospace; width: 72mm; padding: 4mm; }
      h1 { font-size: 14pt; text-align: center; margin: 0 0 8px; }
      .row { display:flex; justify-content:space-between; font-size: 10pt; }
      .ok { text-align:center; margin-top:10px; font-size: 12pt; font-weight: bold; }
    </style></head><body>
      <h1>CATAPRINT — Prueba</h1>
      <div class="row"><span>Local:</span><span>${escapeHtml(tenantName || "—")}</span></div>
      <div class="row"><span>Terminal:</span><span>${escapeHtml(terminalName || "—")}</span></div>
      <div class="row"><span>Impresora:</span><span>${escapeHtml(name)}</span></div>
      <div class="row"><span>Hora:</span><span>${new Date().toLocaleString()}</span></div>
      <div class="ok">✔ IMPRESIÓN OK</div>
    </body></html>`;
    await printer.print({ printer: name, html, title: "CATAPRINT test" });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e?.message ?? e) });
  }
});

const server = app.listen(PORT, "127.0.0.1", () => {
  // eslint-disable-next-line no-console
  console.log(`CATAPRINT v${VERSION} listening on http://127.0.0.1:${PORT}`);
});

server.on("upgrade", (req, socket) => {
  if (!req.url || new URL(req.url, `http://${req.headers.host}`).pathname !== "/ws") {
    socket.destroy();
    return;
  }
  const key = req.headers["sec-websocket-key"];
  if (!key) { socket.destroy(); return; }
  const accept = crypto
    .createHash("sha1")
    .update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
    .digest("base64");
  socket.write([
    "HTTP/1.1 101 Switching Protocols",
    "Upgrade: websocket",
    "Connection: Upgrade",
    `Sec-WebSocket-Accept: ${accept}`,
    "",
    "",
  ].join("\r\n"));

  let buffer = Buffer.alloc(0);
  socket.on("data", (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    const parsed = readWsFrames(buffer);
    buffer = parsed.rest;
    parsed.messages.forEach((msg) => handleWsMessage(socket, msg));
  });
});

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]
  ));
}

async function handleWsMessage(socket, raw) {
  let msg;
  try { msg = JSON.parse(raw); } catch { return writeWsText(socket, { ok: false, error: "Invalid JSON" }); }
  const { id, action, payload = {} } = msg ?? {};
  try {
    let result;
    if (action === "health") {
      result = { ok: true, service: "cataprint", version: VERSION, platform: process.platform };
    } else if (action === "printers") {
      result = { printers: await printers.list() };
    } else if (action === "capabilities") {
      result = await printers.capabilities(payload.name);
    } else if (action === "print") {
      if (!payload.printer) throw new Error("Missing 'printer'");
      if (!payload.html && !payload.raw) throw new Error("Missing 'html' or 'raw'");
      await printer.print(payload);
      result = { ok: true };
    } else {
      throw new Error(`Unknown action: ${action}`);
    }
    writeWsText(socket, { id, ok: true, result });
  } catch (e) {
    writeWsText(socket, { id, ok: false, error: String(e?.message ?? e) });
  }
}

function readWsFrames(buffer) {
  const messages = [];
  let offset = 0;
  while (buffer.length - offset >= 2) {
    const b1 = buffer[offset++];
    const b2 = buffer[offset++];
    const opcode = b1 & 0x0f;
    const masked = (b2 & 0x80) !== 0;
    let len = b2 & 0x7f;
    if (len === 126) {
      if (buffer.length - offset < 2) { offset -= 2; break; }
      len = buffer.readUInt16BE(offset); offset += 2;
    } else if (len === 127) {
      if (buffer.length - offset < 8) { offset -= 2; break; }
      len = Number(buffer.readBigUInt64BE(offset)); offset += 8;
    }
    const maskOffset = masked ? 4 : 0;
    if (buffer.length - offset < maskOffset + len) { offset -= 2; break; }
    const mask = masked ? buffer.subarray(offset, offset + 4) : null;
    offset += maskOffset;
    const payload = Buffer.from(buffer.subarray(offset, offset + len));
    offset += len;
    if (mask) for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i % 4];
    if (opcode === 1) messages.push(payload.toString("utf8"));
  }
  return { messages, rest: buffer.subarray(offset) };
}

function writeWsText(socket, data) {
  const payload = Buffer.from(JSON.stringify(data));
  const header = payload.length < 126
    ? Buffer.from([0x81, payload.length])
    : payload.length < 65536
      ? Buffer.from([0x81, 126, payload.length >> 8, payload.length & 255])
      : Buffer.from([0x81, 127, 0, 0, 0, 0, (payload.length / 0x1000000) & 255, (payload.length / 0x10000) & 255, (payload.length / 0x100) & 255, payload.length & 255]);
  socket.write(Buffer.concat([header, payload]));
}

// Silence unused requires of node-only modules
void path; void fs; void os; void crypto;
