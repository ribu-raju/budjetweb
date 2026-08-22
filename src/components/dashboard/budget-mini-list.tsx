import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatCurrency, budgetStatus, budgetStatusEmoji } from "@/lib/utils";
import type { BudgetSnapshot } from "@/lib/queries/budget-progress";

export function BudgetMiniList({ snapshot, currency }: { snapshot: BudgetSnapshot; currency: string }) {
  const rows = snapshot.categories.slice(0, 5);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Monthly Budget</CardTitle>
        <Link href="/budgets" className="text-xs font-medium text-primary hover:underline">
          View all
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No category budgets set yet.{" "}
            <Link href="/budgets" className="text-primary hover:underline">
              Set one up
            </Link>
            .
          </p>
        ) : (
          rows.map((r) => {
            const status = budgetStatus(r.percentUsed);
            return (
              <div key={r.budgetId}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium">
                    {budgetStatusEmoji[status]} {r.category?.name ?? "Overall"}
                  </span>
                  <span className="text-muted-foreground">
                    {formatCurrency(r.actual, currency)} / {formatCurrency(r.budgeted, currency)}
                  </span>
                </div>
                <Progress
                  value={r.percentUsed}
                  barClassName={status === "over" ? "bg-danger" : status === "close" ? "bg-orange-500" : status === "watch" ? "bg-warning" : "bg-success"}
                />
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
