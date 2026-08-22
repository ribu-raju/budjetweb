import type { SupabaseClient } from "@supabase/supabase-js";
import { toISODate } from "@/lib/utils";

export interface PeriodTotals {
  currentMonth: number;
  previousMonth: number;
  currentYear: number;
}

/**
 * Sums a transaction type (income or expense) over three standard
 * windows. Runs as three small, indexed range queries (family_id,
 * type, txn_date) rather than pulling every row to the client —
 * see project requirement #32 (never download the whole table).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getPeriodTotals(supabase: SupabaseClient<any>, familyId: string, type: "income" | "expense"): Promise<PeriodTotals> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const yearEnd = new Date(now.getFullYear(), 11, 31);

  async function sumRange(start: Date, end: Date) {
    const { data } = await supabase
      .from("transactions")
      .select("amount")
      .eq("family_id", familyId)
      .eq("type", type)
      .gte("txn_date", toISODate(start))
      .lte("txn_date", toISODate(end));
    return (data ?? []).reduce((s: number, r: { amount: number }) => s + Number(r.amount), 0);
  }

  const [currentMonth, previousMonth, currentYear] = await Promise.all([
    sumRange(monthStart, monthEnd),
    sumRange(prevMonthStart, prevMonthEnd),
    sumRange(yearStart, yearEnd),
  ]);

  return { currentMonth, previousMonth, currentYear };
}
