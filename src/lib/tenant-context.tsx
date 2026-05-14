import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";

export type ActiveTenant = {
  id: string;
  code: string;
  name: string;
};

type Ctx = {
  tenant: ActiveTenant | null;
  loading: boolean;
  setTenant: (t: ActiveTenant) => void;
  clearTenant: () => void;
};

const TenantCtx = createContext<Ctx | null>(null);

const TENANT_KEY = "cata_tenant_v1";
const PLATFORM_KEY = "cata_platform_mode_v1";

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenant, setTenantState] = useState<ActiveTenant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") {
      setLoading(false);
      return;
    }
    try {
      const raw = localStorage.getItem(TENANT_KEY);
      if (raw) setTenantState(JSON.parse(raw));
    } catch {}
    setLoading(false);
  }, []);

  const setTenant = useCallback((t: ActiveTenant) => {
    setTenantState(t);
    if (typeof window !== "undefined") {
      localStorage.setItem(TENANT_KEY, JSON.stringify(t));
      localStorage.removeItem(PLATFORM_KEY);
    }
  }, []);

  const clearTenant = useCallback(() => {
    setTenantState(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem(TENANT_KEY);
    }
  }, []);

  return (
    <TenantCtx.Provider value={{ tenant, loading, setTenant, clearTenant }}>
      {children}
    </TenantCtx.Provider>
  );
}

export function useTenant() {
  const v = useContext(TenantCtx);
  if (!v) throw new Error("useTenant must be inside TenantProvider");
  return v;
}

export function setPlatformMode(on: boolean) {
  if (typeof window === "undefined") return;
  if (on) localStorage.setItem(PLATFORM_KEY, "1");
  else localStorage.removeItem(PLATFORM_KEY);
}

export function isPlatformMode(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(PLATFORM_KEY) === "1";
}
