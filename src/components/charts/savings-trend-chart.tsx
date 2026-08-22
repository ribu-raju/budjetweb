"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";
import { formatCurrency } from "@/lib/utils";
import type { MonthPoint } from "@/lib/queries/analytics";

export function SavingsTrendChart({ data, currency }: { data: MonthPoint[]; currency: string }) {
  const series = data.map((m) => ({ label: m.label, savings: m.income - m.expense }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={series} margin={{ left: -20 }}>
        <defs>
          <linearGradient id="savingsFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={70} tickFormatter={(v) => new Intl.NumberFormat("en", { notation: "compact" }).format(v)} />
        <Tooltip
          formatter={(value: number) => formatCurrency(value, currency)}
          contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: 13 }}
        />
        <Area type="monotone" dataKey="savings" name="Net savings" stroke="#6366f1" strokeWidth={2.5} fill="url(#savingsFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
