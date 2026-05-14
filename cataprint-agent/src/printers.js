// Cross-platform printer enumeration.
// Uses pdf-to-printer when available (Win/Mac), falls back to lpstat on Linux.

const { exec } = require("child_process");
const util = require("util");
const execp = util.promisify(exec);

let ptp = null;
try {
  ptp = require("pdf-to-printer");
} catch {
  ptp = null;
}

async function list() {
  // Preferred: pdf-to-printer (Windows + macOS)
  if (ptp && typeof ptp.getPrinters === "function") {
    try {
      const printers = await ptp.getPrinters();
      return printers.map((p) => ({
        name: p.name || p.deviceId || String(p),
        driver: p.driverName,
        default: !!p.default,
      }));
    } catch (_) { /* fall through */ }
  }

  // Linux / fallback: CUPS lpstat -p
  try {
    const { stdout } = await execp("lpstat -p");
    return stdout
      .split("\n")
      .map((l) => l.match(/^printer\s+(\S+)/i))
      .filter(Boolean)
      .map((m) => ({ name: m[1] }));
  } catch (_) { /* ignore */ }

  return [];
}

async function capabilities(name) {
  // We can't reliably probe cutter via OS print spooler; assume "partial"
  // for thermal-style names, "none" otherwise. The agent always emits an
  // ESC/POS partial cut after an HTML print when cut !== false.
  const lower = String(name || "").toLowerCase();
  const looksThermal = /(tm-|tsp|epson|xprinter|gprinter|3nstar|pos|thermal|80mm|58mm|rongta|hpr|sat-)/i.test(lower);
  return {
    autoCutter: looksThermal ? "partial" : "none",
    raw: true,
  };
}

module.exports = { list, capabilities };
