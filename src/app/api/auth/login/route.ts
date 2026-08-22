import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loginSchema } from "@/lib/validations";

const MAX_ATTEMPTS = 5;
const WINDOW_MINUTES = 15;

// Generic message on purpose — never reveal whether the email exists
// or the password was wrong (project requirement #31/#2).
const GENERIC_ERROR = "Incorrect email or password.";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });
  }
  const { email, password } = parsed.data;

  const admin = createAdminClient();
  const since = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();

  // --- brute-force guard -------------------------------------------------
  const { count } = await admin
    .from("login_attempts")
    .select("id", { count: "exact", head: true })
    .eq("email", email)
    .eq("succeeded", false)
    .gte("attempted_at", since);

  if ((count ?? 0) >= MAX_ATTEMPTS) {
    return NextResponse.json(
      { error: `Too many failed attempts. Try again in ${WINDOW_MINUTES} minutes.` },
      { status: 429 }
    );
  }

  // --- attempt sign-in -----------------------------------------------------
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  await admin.from("login_attempts").insert({ email, ip_address: ip, succeeded: !error });

  if (error) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
