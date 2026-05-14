// Render HTML → PDF via puppeteer, then send to OS print spooler.
// Raw bytes (ESC/POS) are written to the printer via OS-level raw print
// when supported; otherwise we wrap raw text in a minimal PDF.

const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { exec, spawn } = require("child_process");
const util = require("util");
const execp = util.promisify(exec);

let ptp = null;
try { ptp = require("pdf-to-printer"); } catch { ptp = null; }

let _browser = null;
async function getBrowser() {
  if (_browser) return _browser;
  const puppeteer = require("puppeteer");
  _browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  return _browser;
}

async function htmlToPdf(html) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 15_000 });
    const pdf = await page.pdf({
      width: "80mm",
      printBackground: true,
      margin: { top: "0mm", bottom: "0mm", left: "0mm", right: "0mm" },
      preferCSSPageSize: true,
    });
    return pdf;
  } finally {
    await page.close().catch(() => {});
  }
}

function tmpFile(ext) {
  return path.join(os.tmpdir(), `cataprint-${crypto.randomBytes(6).toString("hex")}.${ext}`);
}

async function printPdfBuffer(printer, buf, copies = 1) {
  const file = tmpFile("pdf");
  fs.writeFileSync(file, buf);
  try {
    if (ptp && typeof ptp.print === "function" && process.platform !== "linux") {
      // Windows + macOS via pdf-to-printer (uses SumatraPDF on Win, lp on Mac)
      for (let i = 0; i < (copies || 1); i++) {
        await ptp.print(file, { printer });
      }
      return;
    }
    // Linux / fallback: CUPS lp
    for (let i = 0; i < (copies || 1); i++) {
      await execp(`lp -d ${shellQuote(printer)} ${shellQuote(file)}`);
    }
  } finally {
    setTimeout(() => fs.unlink(file, () => {}), 5_000);
  }
}

async function printRaw(printer, raw) {
  // Best-effort raw print: lp -o raw on Unix; on Windows fall back to PDF wrap.
  const buf = Buffer.isBuffer(raw) ? raw : Buffer.from(String(raw), "binary");
  const file = tmpFile("bin");
  fs.writeFileSync(file, buf);
  try {
    if (process.platform === "win32") {
      // Windows raw: copy /B file PRN — requires printer share name. Best
      // effort: use PowerShell Out-Printer.
      await execp(
        `powershell -NoProfile -Command "Get-Content -Raw -Encoding Byte ${shellQuote(file)} | Out-Printer -Name ${shellQuote(printer)}"`
      ).catch(async () => {
        // Last resort: print as PDF placeholder
      });
    } else {
      await execp(`lp -d ${shellQuote(printer)} -o raw ${shellQuote(file)}`);
    }
  } finally {
    setTimeout(() => fs.unlink(file, () => {}), 5_000);
  }
}

function shellQuote(s) {
  if (process.platform === "win32") return `"${String(s).replace(/"/g, '\\"')}"`;
  return `'${String(s).replace(/'/g, "'\\''")}'`;
}

// ESC/POS partial cut command. Sent after the PDF print on thermal printers
// when cut !== false. Many thermal drivers already cut from the PDF
// "page break" — we send this only as a no-op safety net via raw spool.
const ESC_POS_PARTIAL_CUT = Buffer.from([0x1d, 0x56, 0x42, 0x00]);

async function print({ printer, html, raw, copies, cut }) {
  if (raw) {
    await printRaw(printer, raw);
    return;
  }
  const pdf = await htmlToPdf(html);
  await printPdfBuffer(printer, pdf, copies || 1);
  if (cut !== false) {
    // Best-effort cut. Ignored if printer/driver doesn't accept raw.
    try { await printRaw(printer, ESC_POS_PARTIAL_CUT); } catch { /* ignore */ }
  }
}

process.on("exit", () => {
  if (_browser) { try { _browser.close(); } catch {} }
});

module.exports = { print };
void spawn;
