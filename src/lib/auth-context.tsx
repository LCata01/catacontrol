import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

export type AppRole = "superadmin" | "cashier" | "disabled" | "platform_admin";

export interface SessionLock {
  kind: "bar" | "entry";
  id: string;
  name: string;
  shiftId: string;
}

interface AuthState {
  loading: boolean;
  session: Session | null;
  userId: string | null;
  username: string | null;
  role: AppRole | null;
  lock: SessionLock | null;
  signIn: (username: string, password: string, companyCode: string) => Promise<void>;
  signInPlatform: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  setLock: (lock: SessionLock | null) => void;
}

const Ctx = createContext<AuthState | null>(null);

const LOCK_KEY = "cata_lock_v1";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [lock, setLockState] = useState<SessionLock | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (uid: string) => {
    const [{ data: prof }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("username").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
    ]);
    setUsername(prof?.username ?? null);
    const r = (roles ?? []).map((x: any) => x.role);
    if (r.includes("disabled")) setRole("disabled");
    else if (r.includes("platform_admin")) setRole("platform_admin");
    else if (r.includes("superadmin")) setRole("superadmin");
    else if (r.includes("cashier")) setRole("cashier");
    else setRole(null);
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s?.user?.id) {
        setTimeout(() => loadProfile(s.user.id), 0);
      } else {
        setUsername(null);
        setRole(null);
        setLockState(null);
        if (typeof window !== "undefined") localStorage.removeItem(LOCK_KEY);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user?.id) {
        loadProfile(data.session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    if (typeof window !== "undefined") {
      const raw = localStorage.getItem(LOCK_KEY);
      if (raw) try { setLockState(JSON.parse(raw)); } catch {}
    }

    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  const signIn = useCallback(async (uname: string, password: string, companyCode: string) => {
    const code = companyCode.trim().toLowerCase();
    const u = uname.trim().toLowerCase();
    const email = `${u}@${code}.cata.local`;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error("Usuario o contraseña incorrectos");
  }, []);

  const signInPlatform = useCallback(async (uname: string, password: string) => {
    const u = uname.trim().toLowerCase();
    const email = `${u}@platform.cata.local`;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error("Usuario o contraseña incorrectos");
  }, []);

  const signOut = useCallback(async () => {
    if (typeof window !== "undefined") localStorage.removeItem(LOCK_KEY);
    setLockState(null);
    await supabase.auth.signOut();
  }, []);

  const setLock = useCallback((l: SessionLock | null) => {
    setLockState(l);
    if (typeof window !== "undefined") {
      if (l) localStorage.setItem(LOCK_KEY, JSON.stringify(l));
      else localStorage.removeItem(LOCK_KEY);
    }
  }, []);

  return (
    <Ctx.Provider value={{
      loading, session, userId: session?.user?.id ?? null,
      username, role, lock, signIn, signInPlatform, signOut, setLock,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}
