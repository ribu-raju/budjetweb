import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { PeriodTotals } from "@/lib/queries/period-totals";

export function PeriodSummaryCards({ totals, currency, type }: { totals: PeriodTotals; currency: string; type: "income" | "expense" }) {
  const color = type === "income" ? "text-success" : "text-danger";
  const cards = [
    { label: "This month", value: totals.currentMonth },
    { label: "Last month", value: totals.previousMonth },
    { label: "This year", value: totals.currentYear },
  ];
  return (
    <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">{c.label}</p>
            <p className={`mt-1 text-xl font-bold ${color}`}>{formatCurrency(c.value, currency)}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
