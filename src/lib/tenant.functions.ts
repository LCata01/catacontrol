import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type TenantInfo = {
  id: string;
  code: string;
  name: string;
  active: boolean;
};

/**
 * Validates company code + password against the companies table using
 * pgcrypto's crypt() for bcrypt comparison. Returns the tenant info
 * on success — the client stores it in localStorage.
 */
export const tenantLogin = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        code: z.string().trim().min(1).max(64),
        password: z.string().min(1).max(200),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const code = data.code.toUpperCase();
    // Use a SQL RPC-like query via .rpc would be cleaner, but a direct call works:
    const { data: rows, error } = await supabaseAdmin
      .from("companies")
      .select("id, name, code, active, password_hash")
      .eq("code", code)
      .maybeSingle();

    if (error) throw new Error("Error consultando boliche");
    if (!rows) throw new Error("Boliche no encontrado");
    if (!rows.active) throw new Error("Boliche desactivado");

    // Verify bcrypt password using a SQL query
    const { data: check, error: cErr } = await supabaseAdmin.rpc("verify_company_password", {
      _code: code,
      _password: data.password,
    });
    if (cErr) throw new Error("Error verificando contraseña");
    if (!check) throw new Error("Contraseña incorrecta");

    return {
      id: rows.id,
      code: rows.code,
      name: rows.name,
      active: rows.active,
    } satisfies TenantInfo;
  });

/** Lists all companies — only platform_admin can call this. */
export const listCompanies = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const isPlatform = (roles ?? []).some((r: any) => r.role === "platform_admin");
    if (!isPlatform) throw new Error("No autorizado");

    const { data, error } = await supabaseAdmin
      .from("companies")
      .select("id, name, code, active, subdomain, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        name: z.string().trim().min(1).max(100),
        code: z
          .string()
          .trim()
          .min(2)
          .max(32)
          .regex(/^[A-Z0-9_-]+$/, "Solo mayúsculas, números, _ y -"),
        password: z.string().min(4).max(200),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const isPlatform = (roles ?? []).some((r: any) => r.role === "platform_admin");
    if (!isPlatform) throw new Error("No autorizado");

    const { data: created, error } = await supabaseAdmin.rpc("create_company_secure", {
      _name: data.name,
      _code: data.code.toUpperCase(),
      _password: data.password,
    });
    if (error) throw new Error(error.message);
    return created;
  });

export const toggleCompanyActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ id: z.string().uuid(), active: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const isPlatform = (roles ?? []).some((r: any) => r.role === "platform_admin");
    if (!isPlatform) throw new Error("No autorizado");

    const { error } = await supabaseAdmin
      .from("companies")
      .update({ active: data.active })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const resetCompanyPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ id: z.string().uuid(), password: z.string().min(4).max(200) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const isPlatform = (roles ?? []).some((r: any) => r.role === "platform_admin");
    if (!isPlatform) throw new Error("No autorizado");

    const { error } = await supabaseAdmin.rpc("set_company_password", {
      _id: data.id,
      _password: data.password,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
