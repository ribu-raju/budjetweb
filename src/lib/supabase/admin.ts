import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * SERVICE-ROLE Supabase client. This key bypasses Row Level Security
 * entirely, so it must only ever be used inside trusted server-side
 * code (API route handlers) for the small number of operations that
 * genuinely need it:
 *   - accepting an invite / creating the auth user for it
 *   - the one-time first-admin bootstrap route
 *   - the daily recurring-transactions cron route
 *
 * The `import "server-only"` line above makes the build fail loudly
 * if this module is ever imported from client-side code.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables."
    );
  }

  return createSupabaseClient<Database>(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
