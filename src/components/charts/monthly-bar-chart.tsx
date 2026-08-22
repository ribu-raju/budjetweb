"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";
import { formatCurrency } from "@/lib/utils";
import type { MonthPoint } from "@/lib/queries/analytics";

export function MonthlyBarChart({ data, currency }: { data: MonthPoint[]; currency: string }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={70} tickFormatter={(v) => new Intl.NumberFormat("en", { notation: "compact" }).format(v)} />
        <Tooltip
          formatter={(value: number) => formatCurrency(value, currency)}
          contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: 13 }}
        />
        <Bar dataKey="expense" name="Spending" radius={[6, 6, 0, 0]} fill="#ef4444" maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}
