import { app } from "electron";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

export type AppConfig = {
  port: number;
  apiKey: string;
  printerName: string | null;
  printerInterface: string | null; // e.g. "printer:XP-80" or "tcp://192.168.0.10"
  printerWidth: 58 | 80;
  cutEnabled: boolean;
  autoReconnect: boolean;
  beepOnPrint: boolean;
  trustedOrigins: string[];
};

const DEFAULTS: AppConfig = {
  port: 47822,
  apiKey: "",
  printerName: null,
  printerInterface: null,
  printerWidth: 80,
  cutEnabled: true,
  autoReconnect: true,
  beepOnPrint: false,
  trustedOrigins: [
    "https://catacontrol.app",
    "https://www.catacontrol.app",
    "https://catacontrol.lovable.app",
    "http://localhost",
    "https://localhost",
    "*.base44.app",
  ],
};

let cached: AppConfig | null = null;
let cfgPath = "";

function getPath(): string {
  if (!cfgPath) cfgPath = path.join(app.getPath("userData"), "config.json");
  return cfgPath;
}

export function loadConfig(): AppConfig {
  if (cached) return cached;
  const p = getPath();
  try {
    if (fs.existsSync(p)) {
      const raw = JSON.parse(fs.readFileSync(p, "utf-8"));
      cached = { ...DEFAULTS, ...raw };
    } else {
      cached = { ...DEFAULTS };
    }
  } catch {
    cached = { ...DEFAULTS };
  }
  if (!cached!.apiKey) {
    cached!.apiKey = crypto.randomBytes(24).toString("hex");
    saveConfig(cached!);
  }
  return cached!;
}

export function saveConfig(next: Partial<AppConfig>): AppConfig {
  const cur = loadConfig();
  cached = { ...cur, ...next };
  fs.mkdirSync(path.dirname(getPath()), { recursive: true });
  fs.writeFileSync(getPath(), JSON.stringify(cached, null, 2), "utf-8");
  return cached!;
}

export function isOriginTrusted(origin: string | undefined, trusted: string[]): boolean {
  if (!origin) return true; // raw localhost clients (no Origin header) are allowed; checked separately
  let host: string;
  try {
    host = new URL(origin).hostname;
  } catch {
    return false;
  }
  if (host === "localhost" || host === "127.0.0.1" || host === "::1") return true;
  for (const rule of trusted) {
    if (rule.startsWith("*.")) {
      const suffix = rule.slice(1); // ".base44.app"
      if (host.endsWith(suffix)) return true;
    } else {
      try {
        const ruleHost = new URL(rule).hostname;
        if (host === ruleHost) return true;
      } catch {
        if (host === rule) return true;
      }
    }
  }
  return false;
}
