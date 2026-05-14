import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertSuperadmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "superadmin")
    .maybeSingle();
  if (error || !data) throw new Error("No autorizado");
}

export const updateUserCredentials = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        targetUserId: z.string().uuid(),
        username: z
          .string()
          .trim()
          .min(2)
          .max(50)
          .regex(/^[a-zA-Z0-9_.-]+$/)
          .optional(),
        displayName: z.string().trim().max(100).optional(),
        password: z.string().min(4).max(72).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertSuperadmin(context.supabase, context.userId);

    const updates: { username?: string; display_name?: string } = {};
    if (data.username) updates.username = data.username.toLowerCase();
    if (data.displayName !== undefined) updates.display_name = data.displayName;

    if (Object.keys(updates).length > 0) {
      // Check unique username
      if (updates.username) {
        const { data: existing } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("username", updates.username)
          .neq("id", data.targetUserId)
          .maybeSingle();
        if (existing) throw new Error("El nombre de usuario ya existe");
      }

      const { error: pErr } = await supabaseAdmin
        .from("profiles")
        .update(updates)
        .eq("id", data.targetUserId);
      if (pErr) throw new Error(pErr.message);
    }

    const authUpdate: { email?: string; password?: string } = {};
    if (updates.username) authUpdate.email = `${updates.username}@cata.local`;
    if (data.password) authUpdate.password = data.password;

    if (Object.keys(authUpdate).length > 0) {
      const { error: aErr } = await supabaseAdmin.auth.admin.updateUserById(
        data.targetUserId,
        authUpdate,
      );
      if (aErr) throw new Error(aErr.message);
    }

    return { ok: true };
  });

export const forceCloseShift = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ shiftId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertSuperadmin(context.supabase, context.userId);
    const { error } = await supabaseAdmin
      .from("shifts")
      .update({ status: "closed", closed_at: new Date().toISOString() })
      .eq("id", data.shiftId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
