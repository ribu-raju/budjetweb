import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface FamilyContext {
  userId: string;
  email: string;
  familyId: string;
  familyName: string;
  currency: string;
  role: "admin" | "member";
  displayName: string;
}

/**
 * Fetches the logged-in user's family/role context for use in Server
 * Components and Route Handlers. Redirects to /login if there is no
 * session (middleware already does this for pages, but Server
 * Components and Route Handlers should never trust that alone —
 * defense in depth). Every private page should call this first and
 * use the returned familyId to scope its queries.
 */
export async function requireFamilyContext(): Promise<FamilyContext> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: member } = await supabase
    .from("family_members")
    .select("family_id, role, display_name, status, families ( name, currency )")
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  if (!member) {
    // Authenticated with Supabase but not (yet) linked to a family —
    // treat as unauthorized rather than leaking a broken dashboard.
    redirect("/login?error=no-family");
  }

  const family = Array.isArray(member.families) ? member.families[0] : member.families;

  return {
    userId: user.id,
    email: user.email ?? "",
    familyId: member.family_id,
    familyName: family?.name ?? "Family",
    currency: family?.currency ?? "AED",
    role: member.role,
    displayName: member.display_name,
  };
}

export function requireAdmin(ctx: FamilyContext) {
  if (ctx.role !== "admin") {
    redirect("/dashboard?error=forbidden");
  }
}
