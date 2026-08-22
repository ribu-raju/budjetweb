"use client";

import { useCallback, useEffect, useState } from "react";
import Papa from "papaparse";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatMonth, monthRangeISO, toISODate } from "@/lib/utils";
import { getBudgetSnapshot } from "@/lib/queries/budget-progress";
import { Download, Printer } from "lucide-react";
import { AllTransactionsTable } from "@/components/transactions/all-transactions-table";
import type { Account, Category } from "@/types/database";

type ReportType = "monthly" | "annual" | "income" | "expense" | "category" | "budget" | "savings" | "accounts" | "history";

const REPORT_TABS: { value: ReportType; label: string }[] = [
  { value: "monthly", label: "Monthly Financial" },
  { value: "annual", label: "Annual Financial" },
  { value: "income", label: "Income" },
  { value: "expense", label: "Expense" },
  { value: "category", label: "Category Spending" },
  { value: "budget", label: "Budget" },
  { value: "savings", label: "Savings" },
  { value: "accounts", label: "Account Balances" },
  { value: "history", label: "All Transactions" },
];

interface ReportTable {
  columns: string[];
  rows: (string | number)[][];
  summary?: { label: string; value: string }[];
}

export function ReportsClient({
  familyId,
  currency,
  accounts,
  categories,
}: {
  familyId: string;
  currency: string;
  accounts: Account[];
  categories: Category[];
}) {
  const [reportType, setReportType] = useState<ReportType>("monthly");
  const [month, setMonth] = useState(toISODate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [year, setYear] = useState(new Date().getFullYear());
  const [dateFrom, setDateFrom] = useState(monthRangeISO().start);
  const [dateTo, setDateTo] = useState(monthRangeISO().end);
  const [table, setTable] = useState<ReportTable | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = useCallback(async () => {
    if (reportType === "history") return;
    setLoading(true);
    const supabase = createClient();

    try {
      if (reportType === "monthly") {
        const monthDate = new Date(month);
        const { start, end } = monthRangeISO(monthDate);
        const { data: tx } = await supabase.from("transactions").select("amount, type").eq("family_id", familyId).gte("txn_date", start).lte("txn_date", end);
        const income = (tx ?? []).filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
        const expense = (tx ?? []).filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
        const snapshot = await getBudgetSnapshot(supabase, familyId, monthDate);
        setTable({
          columns: ["Category", "Budgeted", "Actual", "Remaining", "% Used"],
          rows: snapshot.categories.map((r) => [r.category?.name ?? "—", r.budgeted, r.actual, r.remaining, `${r.percentUsed}%`]),
          summary: [
            { label: "Total Income", value: formatCurrency(income, currency) },
            { label: "Total Expense", value: formatCurrency(expense, currency) },
            { label: "Net Savings", value: formatCurrency(income - expense, currency) },
          ],
        });
      } else if (reportType === "annual") {
        const yearStart = toISODate(new Date(year, 0, 1));
        const yearEnd = toISODate(new Date(year, 11, 31));
        const { data: tx } = await supabase.from("transactions").select("amount, type, txn_date").eq("family_id", familyId).gte("txn_date", yearStart).lte("txn_date", yearEnd);
        const months = Array.from({ length: 12 }, () => ({ income: 0, expense: 0 }));
        for (const t of tx ?? []) {
          const m = new Date(t.txn_date).getMonth();
          if (t.type === "income") months[m].income += Number(t.amount);
          else months[m].expense += Number(t.amount);
        }
        const totalIncome = months.reduce((s, m) => s + m.income, 0);
        const totalExpense = months.reduce((s, m) => s + m.expense, 0);
        setTable({
          columns: ["Month", "Income", "Expense", "Net"],
          rows: months.map((m, i) => [formatMonth(new Date(year, i, 1)), m.income, m.expense, m.income - m.expense]),
          summary: [
            { label: "Total Income", value: formatCurrency(totalIncome, currency) },
            { label: "Total Expense", value: formatCurrency(totalExpense, currency) },
            { label: "Net Savings", value: formatCurrency(totalIncome - totalExpense, currency) },
          ],
        });
      } else if (reportType === "income" || reportType === "expense") {
        const { data: tx } = await supabase
          .from("transactions")
          .select("txn_date, amount, description, income_source, payment_method, categories(name), accounts(name)")
          .eq("family_id", familyId)
          .eq("type", reportType)
          .gte("txn_date", dateFrom)
          .lte("txn_date", dateTo)
          .order("txn_date", { ascending: false })
          .limit(1000);
        const total = (tx ?? []).reduce((s, t) => s + Number(t.amount), 0);
        setTable({
          columns: reportType === "income" ? ["Date", "Source", "Category", "Account", "Amount"] : ["Date", "Category", "Account", "Payment Method", "Amount"],
          rows: (tx ?? []).map((t) =>
            reportType === "income"
              ? [t.txn_date, t.income_source ?? "—", (t.categories as unknown as { name: string } | null)?.name ?? "—", (t.accounts as unknown as { name: string } | null)?.name ?? "—", Number(t.amount)]
              : [t.txn_date, (t.categories as unknown as { name: string } | null)?.name ?? "—", (t.accounts as unknown as { name: string } | null)?.name ?? "—", t.payment_method ?? "—", Number(t.amount)]
          ),
          summary: [{ label: `Total ${reportType}`, value: formatCurrency(total, currency) }],
        });
      } else if (reportType === "category") {
        const { data: tx } = await supabase
          .from("transactions")
          .select("amount, categories(name)")
          .eq("family_id", familyId)
          .eq("type", "expense")
          .gte("txn_date", dateFrom)
          .lte("txn_date", dateTo);
        const map = new Map<string, number>();
        for (const t of tx ?? []) {
          const name = (t.categories as unknown as { name: string } | null)?.name ?? "Uncategorized";
          map.set(name, (map.get(name) ?? 0) + Number(t.amount));
        }
        const total = Array.from(map.values()).reduce((a, b) => a + b, 0);
        const sorted = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
        setTable({
          columns: ["Category", "Total", "% of Spending"],
          rows: sorted.map(([name, val]) => [name, val, total ? `${Math.round((val / total) * 1000) / 10}%` : "0%"]),
          summary: [{ label: "Total Spending", value: formatCurrency(total, currency) }],
        });
      } else if (reportType === "budget") {
        const snapshot = await getBudgetSnapshot(supabase, familyId, new Date(month));
        setTable({
          columns: ["Category", "Budgeted", "Actual", "Remaining", "% Used"],
          rows: [
            ...(snapshot.overall ? [["Overall", snapshot.overall.budgeted, snapshot.overall.actual, snapshot.overall.remaining, `${snapshot.overall.percentUsed}%`]] : []),
            ...snapshot.categories.map((r) => [r.category?.name ?? "—", r.budgeted, r.actual, r.remaining, `${r.percentUsed}%`]),
          ] as (string | number)[][],
        });
      } else if (reportType === "savings") {
        const { data: goals } = await supabase.from("savings_goals").select("*").eq("family_id", familyId);
        setTable({
          columns: ["Goal", "Target", "Current", "Progress %", "Target Date"],
          rows: (goals ?? []).map((g) => [g.name, Number(g.target_amount), Number(g.current_amount), g.target_amount ? `${Math.round((g.current_amount / g.target_amount) * 1000) / 10}%` : "0%", g.target_date ?? "—"]),
        });
      } else if (reportType === "accounts") {
        const { data: balances } = await supabase.from("account_balances").select("*").eq("family_id", familyId);
        setTable({
          columns: ["Account", "Type", "Opening Balance", "Current Balance", "Status"],
          rows: (balances ?? []).map((a) => [a.name, a.type, Number(a.opening_balance), Number(a.current_balance), a.is_active ? "Active" : "Inactive"]),
          summary: [{ label: "Total Available", value: formatCurrency((balances ?? []).filter((a) => a.is_active).reduce((s, a) => s + Number(a.current_balance), 0), currency) }],
        });
      }
    } finally {
      setLoading(false);
    }
  }, [reportType, month, year, dateFrom, dateTo, familyId, currency]);

  useEffect(() => {
    generate();
  }, [generate]);

  function exportCsv() {
    if (!table) return;
    const csv = Papa.unparse([table.columns, ...table.rows]);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${reportType}-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {REPORT_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setReportType(t.value)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${reportType === t.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {reportType === "history" ? (
        <AllTransactionsTable familyId={familyId} currency={currency} accounts={accounts} categories={categories} />
      ) : (
        <>
          <Card>
            <CardContent className="flex flex-wrap items-end gap-3 py-4">
              {(reportType === "monthly" || reportType === "budget") && (
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Month</label>
                  <Input type="date" value={month} onChange={(e) => setMonth(e.target.value)} />
                </div>
              )}
              {reportType === "annual" && (
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Year</label>
                  <Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-28" />
                </div>
              )}
              {(reportType === "income" || reportType === "expense" || reportType === "category") && (
                <>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">From</label>
                    <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">To</label>
                    <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                  </div>
                </>
              )}
              <div className="ml-auto flex gap-2">
                <Button variant="outline" size="sm" onClick={exportCsv} disabled={!table}>
                  <Download className="h-3.5 w-3.5" /> Export CSV
                </Button>
                <Button variant="outline" size="sm" onClick={() => window.print()} disabled={!table}>
                  <Printer className="h-3.5 w-3.5" /> Print / PDF
                </Button>
              </div>
            </CardContent>
          </Card>

          {table?.summary && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {table.summary.map((s) => (
                <Card key={s.label}>
                  <CardContent className="py-3">
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className="text-lg font-bold">{s.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Card className="overflow-hidden print:border-none print:shadow-none">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    {table?.columns.map((c) => (
                      <th key={c} className="px-4 py-3 font-medium">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading ? (
                    <tr>
                      <td className="px-4 py-6 text-center text-muted-foreground" colSpan={table?.columns.length ?? 1}>
                        Generating report…
                      </td>
                    </tr>
                  ) : !table || table.rows.length === 0 ? (
                    <tr>
                      <td className="px-4 py-6 text-center text-muted-foreground" colSpan={table?.columns.length ?? 1}>
                        No data for this period.
                      </td>
                    </tr>
                  ) : (
                    table.rows.map((row, i) => (
                      <tr key={i}>
                        {row.map((cell, j) => (
                          <td key={j} className="whitespace-nowrap px-4 py-2.5">
                            {typeof cell === "number" ? formatCurrency(cell, currency) : cell}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
