import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

/**
 * Server-side Supabase client for use in Server Components, Server
 * Actions, and Route Handlers. Next.js 15+ made cookies() async, so
 * this factory is async too — every caller does
 * `const supabase = await createClient()`.
 *
 * Uses the modern getAll/setAll cookie methods (the pattern @supabase/ssr
 * recommends over the older per-cookie get/set/remove trio). Still only
 * the anon key — RLS in Postgres is what actually makes access safe.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component with no response object to
            // write to. Middleware refreshes the session on every
            // request, so this is safe to ignore.
          }
        },
      },
    }
  );
}
