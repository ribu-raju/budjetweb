import type { SupabaseClient } from "@supabase/supabase-js";
import { monthRangeISO, toISODate } from "@/lib/utils";
import { budgetProgress } from "@/lib/calculations";
import type { Category } from "@/types/database";

export interface CategoryBudgetRow {
  budgetId: string | null;
  category: Category | null; // null = overall/whole-family budget
  budgeted: number;
  actual: number;
  remaining: number;
  percentUsed: number;
  overBy: number;
}

export interface BudgetSnapshot {
  overall: CategoryBudgetRow | null;
  categories: CategoryBudgetRow[];
  totalBudgeted: number;
  totalActual: number;
}

/**
 * Pulls the budget rows for a given month plus actual spending per
 * category and merges them via the single source of truth in
 * lib/calculations.ts (budgetProgress). Used by both the Dashboard
 * and the Monthly Budget page so the two never disagree.
 */
export async function getBudgetSnapshot(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  familyId: string,
  monthDate: Date = new Date()
): Promise<BudgetSnapshot> {
  const periodMonth = toISODate(new Date(monthDate.getFullYear(), monthDate.getMonth(), 1));
  const { start, end } = monthRangeISO(monthDate);

  const [{ data: budgets }, { data: categories }, { data: expenses }] = await Promise.all([
    supabase.from("budgets").select("*").eq("family_id", familyId).eq("period_month", periodMonth),
    supabase.from("categories").select("*").eq("family_id", familyId).eq("type", "expense"),
    supabase.from("transactions").select("amount, category_id").eq("family_id", familyId).eq("type", "expense").gte("txn_date", start).lte("txn_date", end),
  ]);

  const actualByCategory = new Map<string, number>();
  let totalActual = 0;
  for (const e of expenses ?? []) {
    totalActual += Number(e.amount);
    if (e.category_id) {
      actualByCategory.set(e.category_id, (actualByCategory.get(e.category_id) ?? 0) + Number(e.amount));
    }
  }

  const categoryMap = new Map<string, Category>((categories ?? []).map((c: Category) => [c.id, c]));

  let overall: CategoryBudgetRow | null = null;
  const categoryRows: CategoryBudgetRow[] = [];
  let totalBudgeted = 0;

  for (const b of budgets ?? []) {
    const actual = b.category_id ? actualByCategory.get(b.category_id) ?? 0 : totalActual;
    const progress = budgetProgress(Number(b.amount), actual);
    const row: CategoryBudgetRow = {
      budgetId: b.id,
      category: b.category_id ? categoryMap.get(b.category_id) ?? null : null,
      budgeted: progress.budgeted,
      actual: progress.actual,
      remaining: progress.remaining,
      percentUsed: progress.percentUsed,
      overBy: progress.overBy,
    };
    if (!b.category_id) {
      overall = row;
    } else {
      categoryRows.push(row);
      totalBudgeted += Number(b.amount);
    }
  }

  return { overall, categories: categoryRows, totalBudgeted, totalActual };
}
