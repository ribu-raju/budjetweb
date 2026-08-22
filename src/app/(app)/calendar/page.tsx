import { requireFamilyContext } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { CalendarClient } from "./calendar-client";
import { monthRangeISO } from "@/lib/utils";

export const metadata = { title: "Financial Calendar" };
export const dynamic = "force-dynamic";

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const ctx = await requireFamilyContext();
  const supabase = await createClient();
  const resolvedSearchParams = await searchParams;
  const monthDate = resolvedSearchParams.month ? new Date(resolvedSearchParams.month) : new Date();
  const { start, end } = monthRangeISO(monthDate);

  const [{ data: tx }, { data: transfers }, { data: planned }, { data: recurring }] = await Promise.all([
    supabase.from("transactions").select("id, type, txn_date, amount, description, categories(name)").eq("family_id", ctx.familyId).gte("txn_date", start).lte("txn_date", end),
    supabase.from("transfers").select("id, transfer_date, amount, note, from:from_account_id(name), to:to_account_id(name)").eq("family_id", ctx.familyId).gte("transfer_date", start).lte("transfer_date", end),
    supabase.from("planned_expenses").select("id, expected_date, expected_amount, name, status").eq("family_id", ctx.familyId).gte("expected_date", start).lte("expected_date", end),
    supabase.from("recurring_transactions").select("id, next_run_date, amount, description, type").eq("family_id", ctx.familyId).eq("is_active", true).gte("next_run_date", start).lte("next_run_date", end),
  ]);

  return (
    <div>
      <PageHeader title="Financial Calendar" description="Every income, expense, transfer, and planned or recurring item at a glance." />
      <CalendarClient
        currency={ctx.currency}
        monthDate={monthDate.toISOString()}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        transactions={(tx as any[]) ?? []}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        transfers={(transfers as any[]) ?? []}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        planned={(planned as any[]) ?? []}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recurring={(recurring as any[]) ?? []}
      />
    </div>
  );
}
