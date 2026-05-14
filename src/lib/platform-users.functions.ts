import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ROLES = ["superadmin", "cashier", "disabled"] as const;
type Role = (typeof ROLES)[number];

async function assertPlatformAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (!(data ?? []).some((r: any) => r.role === "platform_admin")) {
    throw new Error("No autorizado");
  }
}

async function getCompanyOrThrow(companyId: string) {
  const { data, error } = await supabaseAdmin
    .from("companies")
    .select("id, code")
    .eq("id", companyId)
    .maybeSingle();
  if (error || !data) throw new Error("Boliche no encontrado");
  return data;
}

export const listCompanyUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ companyId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertPlatformAdmin(context.supabase, context.userId);

    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("id, username, display_name, active, created_at")
        .eq("company_id", data.companyId)
        .order("username"),
      supabaseAdmin
        .from("user_roles")
        .select("user_id, role")
        .eq("company_id", data.companyId),
    ]);

    return (profiles ?? []).map((p: any) => ({
      ...p,
      role: roles?.find((r: any) => r.user_id === p.id)?.role ?? null,
    }));
  });

export const createCompanyUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        companyId: z.string().uuid(),
        username: z
          .string()
          .trim()
          .min(2)
          .max(50)
          .regex(/^[a-zA-Z0-9_.-]+$/),
        displayName: z.string().trim().max(100).optional(),
        password: z.string().min(6).max(72),
        role: z.enum(ROLES),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertPlatformAdmin(context.supabase, context.userId);
    const company = await getCompanyOrThrow(data.companyId);

    const username = data.username.toLowerCase();

    // Unique username inside this tenant
    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("company_id", data.companyId)
      .eq("username", username)
      .maybeSingle();
    if (existing) throw new Error("El nombre de usuario ya existe en este boliche");

    const email = `${username}@${company.code}.cata.local`;

    const { data: created, error: aErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        username,
        display_name: data.displayName ?? username,
        company_id: data.companyId,
      },
    });
    if (aErr || !created.user) throw new Error(aErr?.message ?? "Error creando usuario");

    const userId = created.user.id;

    const { error: pErr } = await supabaseAdmin.from("profiles").upsert({
      id: userId,
      username,
      display_name: data.displayName ?? username,
      company_id: data.companyId,
      active: true,
    });
    if (pErr) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error(pErr.message);
    }

    const { error: rErr } = await supabaseAdmin.from("user_roles").insert({
      user_id: userId,
      role: data.role as Role,
      company_id: data.companyId,
    });
    if (rErr) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error(rErr.message);
    }

    return { ok: true, userId };
  });

export const updateCompanyUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        companyId: z.string().uuid(),
        targetUserId: z.string().uuid(),
        username: z
          .string()
          .trim()
          .min(2)
          .max(50)
          .regex(/^[a-zA-Z0-9_.-]+$/)
          .optional(),
        displayName: z.string().trim().max(100).optional(),
        password: z.string().min(6).max(72).optional(),
        role: z.enum(ROLES).optional(),
        active: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertPlatformAdmin(context.supabase, context.userId);
    const company = await getCompanyOrThrow(data.companyId);

    // Verify target belongs to company
    const { data: target } = await supabaseAdmin
      .from("profiles")
      .select("id, company_id, username")
      .eq("id", data.targetUserId)
      .maybeSingle();
    if (!target || target.company_id !== data.companyId) {
      throw new Error("Usuario no pertenece a este boliche");
    }

    const profileUpdates: { username?: string; display_name?: string | null; active?: boolean } = {};
    if (data.username) profileUpdates.username = data.username.toLowerCase();
    if (data.displayName !== undefined) profileUpdates.display_name = data.displayName;
    if (data.active !== undefined) profileUpdates.active = data.active;

    if (profileUpdates.username && profileUpdates.username !== target.username) {
      const { data: dup } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("company_id", data.companyId)
        .eq("username", profileUpdates.username)
        .neq("id", data.targetUserId)
        .maybeSingle();
      if (dup) throw new Error("El nombre de usuario ya existe en este boliche");
    }

    if (Object.keys(profileUpdates).length > 0) {
      const { error } = await supabaseAdmin
        .from("profiles")
        .update(profileUpdates)
        .eq("id", data.targetUserId);
      if (error) throw new Error(error.message);
    }

    const authUpdates: { email?: string; password?: string } = {};
    if (profileUpdates.username)
      authUpdates.email = `${profileUpdates.username}@${company.code}.cata.local`;
    if (data.password) authUpdates.password = data.password;
    if (Object.keys(authUpdates).length > 0) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(
        data.targetUserId,
        authUpdates,
      );
      if (error) throw new Error(error.message);
    }

    if (data.role) {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", data.targetUserId);
      const { error } = await supabaseAdmin.from("user_roles").insert({
        user_id: data.targetUserId,
        role: data.role as Role,
        company_id: data.companyId,
      });
      if (error) throw new Error(error.message);
    }

    return { ok: true };
  });

export const deleteCompanyUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        companyId: z.string().uuid(),
        targetUserId: z.string().uuid(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertPlatformAdmin(context.supabase, context.userId);

    const { data: target } = await supabaseAdmin
      .from("profiles")
      .select("id, company_id")
      .eq("id", data.targetUserId)
      .maybeSingle();
    if (!target || target.company_id !== data.companyId) {
      throw new Error("Usuario no pertenece a este boliche");
    }

    const [{ error: rolesErr }, { error: profileErr }] = await Promise.all([
      supabaseAdmin.from("user_roles").delete().eq("user_id", data.targetUserId),
      supabaseAdmin.from("profiles").delete().eq("id", data.targetUserId),
    ]);
    if (rolesErr) throw new Error(rolesErr.message);
    if (profileErr) throw new Error(profileErr.message);

    const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(data.targetUserId);
    if (authErr) throw new Error(authErr.message);

    return { ok: true };
  });
