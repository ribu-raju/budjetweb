import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Handles the redirect Supabase sends the browser to after a
 * password-recovery (or magic-link) email is clicked. Exchanges the
 * one-time `code` for a real session (setting the auth cookies), then
 * forwards the user to wherever they should land — normally
 * /reset-password so they can choose a new password.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/reset-password";

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
