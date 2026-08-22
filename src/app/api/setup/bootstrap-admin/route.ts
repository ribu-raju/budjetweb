import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { bootstrapAdminSchema } from "@/lib/validations";

/**
 * One-time setup route: creates the family and the very first admin
 * account. Guarded two ways:
 *   1. Requires ADMIN_BOOTSTRAP_SECRET to match exactly.
 *   2. Refuses to run at all once ANY family already exists — so even
 *      a leaked secret can't be used to create a second family later.
 *      Rotate/remove ADMIN_BOOTSTRAP_SECRET after you've used this once.
 */
export async function POST(request: NextRequest) {
  const secretConfigured = process.env.ADMIN_BOOTSTRAP_SECRET;
  if (!secretConfigured) {
    return NextResponse.json({ error: "Bootstrap is disabled." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = bootstrapAdminSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }
  const { secret, familyName, currency, adminEmail, adminPassword, adminName } = parsed.data;

  if (secret !== secretConfigured) {
    return NextResponse.json({ error: "Invalid setup secret." }, { status: 403 });
  }

  const admin = createAdminClient();

  const { count } = await admin.from("families").select("id", { count: "exact", head: true });
  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: "Setup has already been completed. Remove ADMIN_BOOTSTRAP_SECRET to keep this route disabled." },
      { status: 403 }
    );
  }

  const { data: family, error: familyError } = await admin
    .from("families")
    .insert({ name: familyName, currency })
    .select()
    .single();

  if (familyError || !family) {
    return NextResponse.json({ error: "Could not create the family." }, { status: 500 });
  }

  const { data: created, error: createUserError } = await admin.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
  });

  if (createUserError || !created.user) {
    await admin.from("families").delete().eq("id", family.id);
    return NextResponse.json({ error: createUserError?.message ?? "Could not create the admin account." }, { status: 500 });
  }

  const { error: memberError } = await admin.from("family_members").insert({
    family_id: family.id,
    user_id: created.user.id,
    role: "admin",
    display_name: adminName,
    status: "active",
  });

  if (memberError) {
    await admin.auth.admin.deleteUser(created.user.id);
    await admin.from("families").delete().eq("id", family.id);
    return NextResponse.json({ error: "Could not finish setup. Please try again." }, { status: 500 });
  }

  await admin.rpc("seed_default_categories", { p_family_id: family.id });

  return NextResponse.json({ ok: true });
}
