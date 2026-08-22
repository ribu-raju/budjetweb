import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Daily maintenance job, called once a day by Vercel Cron (see
 * vercel.json) — the CRON_SECRET check stops anyone else from
 * triggering it. Two independent Postgres functions do the actual
 * work so each stays atomic and idempotent:
 *   - generate_due_recurring_transactions(): posts income/expense
 *     entries for any recurring rule that's come due.
 *   - generate_notifications(): raises budget/low-balance/upcoming
 *     expense/savings/recurring alerts (project requirement #19),
 *     each deduplicated so re-running this daily never spams family
 *     members with repeats of the same alert.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const [recurringResult, notificationsResult] = await Promise.all([
    admin.rpc("generate_due_recurring_transactions"),
    admin.rpc("generate_notifications"),
  ]);

  if (recurringResult.error || notificationsResult.error) {
    return NextResponse.json(
      { error: recurringResult.error?.message ?? notificationsResult.error?.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    transactionsGenerated: recurringResult.data,
    notificationsGenerated: notificationsResult.data,
  });
}
