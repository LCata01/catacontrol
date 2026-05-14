// Per-machine memory of last printer used by (tenant, terminal, cashier).
// localStorage only — no DB sync (each PC remembers its own).

const KEY = "cata_print_v1";
const MACHINE_KEY = "cata_machine_id_v1";

type Map = Record<string, string>;

function read(): Map {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Map;
  } catch {
    return {};
  }
}

function write(m: Map) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(m));
}

export function getMachineId(): string {
  if (typeof window === "undefined") return "ssr";
  let id = localStorage.getItem(MACHINE_KEY);
  if (!id) {
    id =
      (crypto as any)?.randomUUID?.() ??
      Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(MACHINE_KEY, id as string);
  }
  return id as string;
}

function bindingKey(args: {
  tenantId?: string | null;
  terminalId?: string | null;
  userId?: string | null;
}) {
  return [
    args.tenantId ?? "_",
    args.terminalId ?? "_",
    args.userId ?? "_",
    getMachineId(),
  ].join("|");
}

export function getLastPrinter(args: {
  tenantId?: string | null;
  terminalId?: string | null;
  userId?: string | null;
}): string | null {
  return read()[bindingKey(args)] ?? null;
}

export function setLastPrinter(
  args: {
    tenantId?: string | null;
    terminalId?: string | null;
    userId?: string | null;
  },
  printer: string,
) {
  const m = read();
  m[bindingKey(args)] = printer;
  write(m);
}

// --- Active session printer (cleared on shift close / signout) ---

const ACTIVE_KEY = "cata_active_printer_v1";

export interface ActivePrinter {
  name: string;
  cutter: "full" | "partial" | "none";
  shiftId?: string;
  /** When true, no tickets are printed for this session. */
  bypass?: boolean;
}

export function getActivePrinter(): ActivePrinter | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(ACTIVE_KEY) ?? "null");
  } catch {
    return null;
  }
}

export function setActivePrinter(p: ActivePrinter | null) {
  if (typeof window === "undefined") return;
  if (!p) localStorage.removeItem(ACTIVE_KEY);
  else localStorage.setItem(ACTIVE_KEY, JSON.stringify(p));
}
