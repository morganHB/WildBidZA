import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/db";

let adminClient: ReturnType<typeof createClient<Database, "public">> | undefined;

export function createSupabaseAdminClient() {
  if (adminClient) {
    return adminClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Missing Supabase admin env variables");
  }

  adminClient = createClient<Database, "public">(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return adminClient;
}
