import type { SupabaseClient } from "@supabase/supabase-js";
import { toISODate } from "@/lib/utils";

export type RangeKey = "this_month" | "last_month" | "last_3" | "last_6" | "this_year" | "custom";

export function resolveRange(key: RangeKey, customFrom?: string, customTo?: string) {
  const now = new Date();
  switch (key) {
    case "this_month":
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: new Date(now.getFullYear(), now.getMonth() + 1, 0) };
    case "last_month":
      return { start: new Date(now.getFullYear(), now.getMonth() - 1, 1), end: new Date(now.getFullYear(), now.getMonth(), 0) };
    case "last_3":
      return { start: new Date(now.getFullYear(), now.getMonth() - 2, 1), end: new Date(now.getFullYear(), now.getMonth() + 1, 0) };
    case "last_6":
      return { start: new Date(now.getFullYear(), now.getMonth() - 5, 1), end: new Date(now.getFullYear(), now.getMonth() + 1, 0) };
    case "this_year":
      return { start: new Date(now.getFullYear(), 0, 1), end: new Date(now.getFullYear(), 11, 31) };
    case "custom":
      return {
        start: customFrom ? new Date(customFrom) : new Date(now.getFullYear(), now.getMonth(), 1),
        end: customTo ? new Date(customTo) : now,
      };
  }
}

export interface RangeTransaction {
  amount: number;
  type: "income" | "expense";
  txn_date: string;
  account_id: string;
  payment_method: string | null;
  category_id: string | null;
  categories: { name: string; color: string } | null;
  accounts: { name: string } | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getRangeTransactions(supabase: SupabaseClient<any>, familyId: string, start: Date, end: Date): Promise<RangeTransaction[]> {
  const { data } = await supabase
    .from("transactions")
    .select("amount, type, txn_date, account_id, payment_method, category_id, categories(name, color), accounts(name)")
    .eq("family_id", familyId)
    .gte("txn_date", toISODate(start))
    .lte("txn_date", toISODate(end));
  return (data as unknown as RangeTransaction[]) ?? [];
}

export interface MonthPoint {
  month: string; // YYYY-MM
  label: string;
  income: number;
  expense: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getMonthlySeries(supabase: SupabaseClient<any>, familyId: string, monthsBack = 12): Promise<MonthPoint[]> {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1), 1);
  const { data } = await supabase
    .from("transactions")
    .select("amount, type, txn_date")
    .eq("family_id", familyId)
    .gte("txn_date", toISODate(start));

  const points: MonthPoint[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    points.push({ month: key, label: d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" }), income: 0, expense: 0 });
  }
  const index = new Map(points.map((p, i) => [p.month, i]));

  for (const row of data ?? []) {
    const key = row.txn_date.slice(0, 7);
    const idx = index.get(key);
    if (idx === undefined) continue;
    if (row.type === "income") points[idx].income += Number(row.amount);
    else points[idx].expense += Number(row.amount);
  }

  return points;
}
