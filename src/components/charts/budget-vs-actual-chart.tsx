"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { formatCurrency } from "@/lib/utils";
import type { CategoryBudgetRow } from "@/lib/queries/budget-progress";

export function BudgetVsActualChart({ rows, currency }: { rows: CategoryBudgetRow[]; currency: string }) {
  const data = rows.map((r) => ({ name: r.category?.name ?? "Overall", Budgeted: r.budgeted, Actual: r.actual }));

  if (data.length === 0) {
    return <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">No budgets set for this month yet.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(240, data.length * 44)}>
      <BarChart data={data} layout="vertical" margin={{ left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
        <XAxis type="number" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => new Intl.NumberFormat("en", { notation: "compact" }).format(v)} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={110} />
        <Tooltip
          formatter={(value: number) => formatCurrency(value, currency)}
          contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: 13 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="Budgeted" fill="#94a3b8" radius={[0, 4, 4, 0]} maxBarSize={16} />
        <Bar dataKey="Actual" fill="#6366f1" radius={[0, 4, 4, 0]} maxBarSize={16} />
      </BarChart>
    </ResponsiveContainer>
  );
}
