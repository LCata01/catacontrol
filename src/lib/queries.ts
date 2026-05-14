import { supabase } from "@/integrations/supabase/client";

export async function getActiveEvent() {
  const { data, error } = await supabase
    .from("events").select("*").eq("status", "active").maybeSingle();
  if (error) throw error;
  return data;
}

export async function getOpenShift(userId: string) {
  const { data, error } = await supabase
    .from("shifts").select("*")
    .eq("user_id", userId).eq("status", "open")
    .order("opened_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return data;
}
