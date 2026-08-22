import { formatCurrency, pct } from "@/lib/utils";
import { percentChange } from "@/lib/calculations";
import type { MonthPoint } from "@/lib/queries/analytics";
import type { BudgetSnapshot } from "@/lib/queries/budget-progress";

export interface Insight {
  severity: "info" | "warning" | "danger";
  text: string;
}

/**
 * Turns already-aggregated numbers into the plain-language insights
 * described in project requirement #14. Deliberately takes only
 * derived summaries (not raw rows) so it stays cheap to call from a
 * Server Component on every dashboard/analytics load.
 */
export function generateInsights(params: {
  currency: string;
  monthlySeries: MonthPoint[]; // oldest first
  categoryThisMonth: { name: string; total: number }[]; // sorted desc by total
  categoryLastMonth: { name: string; total: number }[];
  budgetSnapshot: BudgetSnapshot;
}): Insight[] {
  const { currency, monthlySeries, categoryThisMonth, categoryLastMonth, budgetSnapshot } = params;
  const insights: Insight[] = [];

  const thisMonth = monthlySeries[monthlySeries.length - 1];

  // 1. Category spend change vs last month (top 3 categories this month)
  const lastMonthMap = new Map(categoryLastMonth.map((c) => [c.name, c.total]));
  for (const cat of categoryThisMonth.slice(0, 3)) {
    const prev = lastMonthMap.get(cat.name) ?? 0;
    const change = percentChange(cat.total, prev);
    if (change !== null && Math.abs(change) >= 10) {
      insights.push({
        severity: change > 0 ? "warning" : "info",
        text: `${cat.name} spending ${change > 0 ? "increased" : "decreased"} ${Math.abs(change)}% compared with last month.`,
      });
    }
  }

  // 2. Ranking of top expense categories this month
  if (categoryThisMonth.length >= 2) {
    const [first, second] = categoryThisMonth;
    insights.push({ severity: "info", text: `${first.name} is your top expense category this month, followed by ${second.name}.` });
  }

  // 3. Budgets close to / over the limit
  for (const row of budgetSnapshot.categories) {
    if (row.percentUsed >= 100) {
      insights.push({ severity: "danger", text: `You've gone over budget on ${row.category?.name} by ${formatCurrency(row.overBy, currency)}.` });
    } else if (row.percentUsed >= 90) {
      insights.push({ severity: "warning", text: `You've used ${row.percentUsed}% of your ${row.category?.name} budget.` });
    }
  }

  // 4. On-track-to-save projection based on days elapsed this month
  if (thisMonth) {
    const now = new Date();
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const netSoFar = thisMonth.income - thisMonth.expense;
    if (dayOfMonth >= 5) {
      const projected = Math.round((netSoFar / dayOfMonth) * daysInMonth);
      insights.push({
        severity: projected >= 0 ? "info" : "warning",
        text: projected >= 0
          ? `You're on track to save about ${formatCurrency(projected, currency)} this month.`
          : `At this pace, you may end the month ${formatCurrency(Math.abs(projected), currency)} over your income.`,
      });
    }
  }

  // 5. Average monthly spending over the trailing window
  if (monthlySeries.length >= 3) {
    const completeMonths = monthlySeries.slice(0, -1); // exclude current, still-in-progress month
    const avg = completeMonths.reduce((s, m) => s + m.expense, 0) / completeMonths.length;
    insights.push({ severity: "info", text: `Your average monthly spending over the last ${completeMonths.length} months is ${formatCurrency(Math.round(avg), currency)}.` });
  }

  // 6. Savings rate this month
  if (thisMonth && thisMonth.income > 0) {
    const savingsRate = pct(thisMonth.income - thisMonth.expense, thisMonth.income);
    if (savingsRate < 0) {
      insights.push({ severity: "danger", text: `You spent ${formatCurrency(Math.abs(thisMonth.income - thisMonth.expense), currency)} more than you earned this month.` });
    }
  }

  return insights.slice(0, 8);
}
