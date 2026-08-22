import { requireFamilyContext } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { getRangeTransactions, getMonthlySeries, resolveRange, type RangeKey } from "@/lib/queries/analytics";
import { getBudgetSnapshot } from "@/lib/queries/budget-progress";
import { generateInsights } from "@/lib/insights";
import { averageDailySpending } from "@/lib/calculations";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { RangeSelector } from "@/components/analytics/range-selector";
import { InsightsPanel } from "@/components/analytics/insights-panel";
import { CategoryDonutChart } from "@/components/charts/category-donut-chart";
import { MonthlyBarChart } from "@/components/charts/monthly-bar-chart";
import { IncomeExpenseLineChart } from "@/components/charts/income-expense-line-chart";
import { BudgetVsActualChart } from "@/components/charts/budget-vs-actual-chart";
import { SavingsTrendChart } from "@/components/charts/savings-trend-chart";
import { formatCurrency, toISODate } from "@/lib/utils";

export const metadata = { title: "Spending Analysis" };
export const dynamic = "force-dynamic";

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ range?: string; from?: string; to?: string }> }) {
  const ctx = await requireFamilyContext();
  const supabase = await createClient();
  const resolvedSearchParams = await searchParams;

  const rangeKey = (resolvedSearchParams.range as RangeKey) || "this_month";
  const { start, end } = resolveRange(rangeKey, resolvedSearchParams.from, resolvedSearchParams.to);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const [rangeTx, monthlySeries, budgetSnapshot, thisMonthTx, prevMonthTx] = await Promise.all([
    getRangeTransactions(supabase, ctx.familyId, start, end),
    getMonthlySeries(supabase, ctx.familyId, 12),
    getBudgetSnapshot(supabase, ctx.familyId),
    getRangeTransactions(supabase, ctx.familyId, monthStart, monthEnd),
    getRangeTransactions(supabase, ctx.familyId, prevMonthStart, prevMonthEnd),
  ]);

  const rangeExpenses = rangeTx.filter((t) => t.type === "expense");

  // Category donut + top categories
  const byCategory = new Map<string, { name: string; color: string; total: number }>();
  for (const t of rangeExpenses) {
    const key = t.categories?.name ?? "Uncategorized";
    const existing = byCategory.get(key);
    if (existing) existing.total += Number(t.amount);
    else byCategory.set(key, { name: key, color: t.categories?.color ?? "#94a3b8", total: Number(t.amount) });
  }
  const categorySlices = Array.from(byCategory.values()).sort((a, b) => b.total - a.total);

  // Payment method breakdown
  const byPaymentMethod = new Map<string, number>();
  for (const t of rangeExpenses) {
    const key = t.payment_method ?? "Unspecified";
    byPaymentMethod.set(key, (byPaymentMethod.get(key) ?? 0) + Number(t.amount));
  }

  // Account breakdown
  const byAccount = new Map<string, number>();
  for (const t of rangeExpenses) {
    const key = t.accounts?.name ?? "Unknown";
    byAccount.set(key, (byAccount.get(key) ?? 0) + Number(t.amount));
  }

  const totalRangeExpense = rangeExpenses.reduce((s, t) => s + Number(t.amount), 0);
  const daysInRange = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  const avgDaily = averageDailySpending(totalRangeExpense, daysInRange);

  function categoryTotals(rows: typeof thisMonthTx) {
    const map = new Map<string, number>();
    for (const t of rows.filter((r) => r.type === "expense")) {
      const key = t.categories?.name ?? "Uncategorized";
      map.set(key, (map.get(key) ?? 0) + Number(t.amount));
    }
    return Array.from(map.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
  }

  const insights = generateInsights({
    currency: ctx.currency,
    monthlySeries,
    categoryThisMonth: categoryTotals(thisMonthTx),
    categoryLastMonth: categoryTotals(prevMonthTx),
    budgetSnapshot,
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Spending Analysis" description="Understand where your family's money goes." />

      <RangeSelector current={rangeKey} from={resolvedSearchParams.from ?? toISODate(start)} to={resolvedSearchParams.to ?? toISODate(end)} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatMini label="Total spent" value={formatCurrency(totalRangeExpense, ctx.currency)} />
        <StatMini label="Avg. daily spending" value={formatCurrency(avgDaily, ctx.currency)} />
        <StatMini label="Top category" value={categorySlices[0]?.name ?? "—"} />
        <StatMini label="Categories used" value={String(categorySlices.length)} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryDonutChart data={categorySlices.map((c) => ({ name: c.name, value: c.total, color: c.color }))} currency={ctx.currency} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Spending (last 12 months)</CardTitle>
          </CardHeader>
          <CardContent>
            <MonthlyBarChart data={monthlySeries} currency={ctx.currency} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Income vs Expense</CardTitle>
          </CardHeader>
          <CardContent>
            <IncomeExpenseLineChart data={monthlySeries} currency={ctx.currency} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Savings Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <SavingsTrendChart data={monthlySeries} currency={ctx.currency} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Budget vs Actual (this month)</CardTitle>
          </CardHeader>
          <CardContent>
            <BudgetVsActualChart rows={budgetSnapshot.categories} currency={ctx.currency} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BreakdownCard title="Spending by Account" entries={Array.from(byAccount.entries())} currency={ctx.currency} />
        <BreakdownCard title="Spending by Payment Method" entries={Array.from(byPaymentMethod.entries())} currency={ctx.currency} />
      </div>

      <InsightsPanel insights={insights} />
    </div>
  );
}

function StatMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-base font-semibold">{value}</p>
    </div>
  );
}

function BreakdownCard({ title, entries, currency }: { title: string; entries: [string, number][]; currency: string }) {
  const sorted = [...entries].sort((a, b) => b[1] - a[1]);
  const max = sorted[0]?.[1] ?? 1;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data for this period.</p>
        ) : (
          sorted.map(([name, total]) => (
            <div key={name}>
              <div className="mb-1 flex justify-between text-sm">
                <span>{name}</span>
                <span className="font-medium">{formatCurrency(total, currency)}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${(total / max) * 100}%` }} />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
