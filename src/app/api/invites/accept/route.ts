import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { acceptInviteSchema } from "@/lib/validations";

/**
 * The ONLY way a new login can be created in this app besides the
 * one-time bootstrap route: an admin issues an invite (see
 * /settings/family), and the invitee redeems it here with the token
 * from their email. This keeps registration fully controlled — there
 * is no public sign-up form anywhere in the app.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = acceptInviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }
  const { token, displayName, password } = parsed.data;

  const admin = createAdminClient();

  const { data: invite, error: inviteError } = await admin
    .from("invites")
    .select("*")
    .eq("token", token)
    .is("accepted_at", null)
    .single();

  if (inviteError || !invite) {
    return NextResponse.json({ error: "This invite link is invalid or has already been used." }, { status: 400 });
  }

  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: "This invite link has expired. Ask an admin to send a new one." }, { status: 400 });
  }

  // Create the auth user (email pre-verified since it came via a
  // controlled invite, no public sign-up confirmation flow needed).
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: invite.email,
    password,
    email_confirm: true,
  });

  if (createError || !created.user) {
    const message = createError?.message?.includes("already registered")
      ? "An account with this email already exists. Try logging in instead."
      : "Could not create your account. Please try again or ask an admin for a new invite.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { error: memberError } = await admin.from("family_members").insert({
    family_id: invite.family_id,
    user_id: created.user.id,
    role: invite.role,
    display_name: displayName,
    status: "active",
  });

  if (memberError) {
    // Roll back the orphaned auth user so retrying the invite works cleanly.
    await admin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: "Could not finish setting up your account. Please try again." }, { status: 500 });
  }

  await admin.from("invites").update({ accepted_at: new Date().toISOString() }).eq("id", invite.id);

  return NextResponse.json({ ok: true });
}
