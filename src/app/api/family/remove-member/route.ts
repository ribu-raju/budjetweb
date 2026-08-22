import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const schema = z.object({ memberUserId: z.string().uuid() });

/**
 * Fully revokes a family member's access: deletes their family_members
 * row AND their Supabase auth account (the row cascades automatically
 * via its FK, but removing the auth user too means their credentials
 * stop working everywhere, not just inside this app's RLS checks).
 * Requires the caller to be an admin of the SAME family as the target
 * — verified with the caller's own session before ever touching the
 * service-role client.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: caller } = await supabase.from("family_members").select("family_id, role").eq("user_id", user.id).single();
  if (!caller || caller.role !== "admin") {
    return NextResponse.json({ error: "Only an admin can remove family members." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input." }, { status: 400 });

  if (parsed.data.memberUserId === user.id) {
    return NextResponse.json({ error: "You can't remove your own account here." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: target } = await admin.from("family_members").select("family_id").eq("user_id", parsed.data.memberUserId).single();

  if (!target || target.family_id !== caller.family_id) {
    return NextResponse.json({ error: "Member not found in your family." }, { status: 404 });
  }

  const { error } = await admin.auth.admin.deleteUser(parsed.data.memberUserId);
  if (error) {
    return NextResponse.json({ error: "Could not remove this member." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
