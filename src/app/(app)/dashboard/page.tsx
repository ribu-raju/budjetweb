import { requireFamilyContext } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { getPeriodTotals } from "@/lib/queries/period-totals";
import { getBudgetSnapshot } from "@/lib/queries/budget-progress";
import { totalAvailableBalance, sumBalancesByType, remainingMonthlyBudget } from "@/lib/calculations";
import { Greeting } from "@/components/dashboard/greeting";
import { StatCard } from "@/components/dashboard/stat-card";
import { BudgetMiniList } from "@/components/dashboard/budget-mini-list";
import { RecentTransactions, type RecentItem } from "@/components/dashboard/recent-transactions";
import { AccountsMiniList } from "@/components/dashboard/accounts-mini-list";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatMonth, monthRangeISO } from "@/lib/utils";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  PiggyBank,
  Target,
  Wallet,
  Landmark,
  Layers,
  CalendarClock,
} from "lucide-react";
import type { AccountBalance } from "@/types/database";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic"; // always show live data, never a stale cache

export default async function DashboardPage() {
  const ctx = await requireFamilyContext();
  const supabase = await createClient();
  const { start, end } = monthRangeISO();

  const [incomeTotals, expenseTotals, budgetSnapshot, { data: balances }, { data: recentTx }, { data: recentTransfers }, { data: plannedExpenses }] =
    await Promise.all([
      getPeriodTotals(supabase, ctx.familyId, "income"),
      getPeriodTotals(supabase, ctx.familyId, "expense"),
      getBudgetSnapshot(supabase, ctx.familyId),
      supabase.from("account_balances").select("*").eq("family_id", ctx.familyId).eq("is_active", true),
      supabase
        .from("transactions")
        .select("id, type, txn_date, amount, description, income_source, payment_method")
        .eq("family_id", ctx.familyId)
        .order("txn_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("transfers")
        .select("id, transfer_date, amount, note, from:from_account_id(name), to:to_account_id(name)")
        .eq("family_id", ctx.familyId)
        .order("transfer_date", { ascending: false })
        .limit(8),
      supabase
        .from("planned_expenses")
        .select("expected_amount")
        .eq("family_id", ctx.familyId)
        .eq("status", "planned"),
    ]);

  const accountBalances = (balances as AccountBalance[]) ?? [];
  const cashBalance = sumBalancesByType(accountBalances, ["cash"]);
  const bankBalance = sumBalancesByType(accountBalances, ["bank", "savings"]);
  const totalAvailable = totalAvailableBalance(accountBalances);
  const monthlySavings = incomeTotals.currentMonth - expenseTotals.currentMonth;
  const overallBudget = budgetSnapshot.overall?.budgeted ?? 0;
  // Only a real, admin-set overall budget produces a meaningful
  // "remaining" figure — with none set, 0 - expenses would show a
  // large, misleading negative number, so we show 0 with a hint instead.
  const remainingBudget = overallBudget > 0 ? remainingMonthlyBudget(overallBudget, expenseTotals.currentMonth) : 0;
  const plannedTotal = (plannedExpenses ?? []).reduce((s, p) => s + Number(p.expected_amount), 0);
  const availableAfterPlanned = totalAvailable - plannedTotal;

  const recentItems: RecentItem[] = [
    ...(recentTx ?? []).map((t) => ({
      id: t.id,
      kind: t.type as "income" | "expense",
      date: t.txn_date,
      description: t.description || t.income_source || t.payment_method || (t.type === "income" ? "Income" : "Expense"),
      amount: Number(t.amount),
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...((recentTransfers ?? []) as any[]).map((t) => ({
      id: t.id,
      kind: "transfer" as const,
      date: t.transfer_date,
      description: `${t.from?.name ?? "Account"} → ${t.to?.name ?? "Account"}`,
      amount: Number(t.amount),
    })),
  ]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <Greeting name={ctx.displayName} />
        <p className="text-sm text-muted-foreground">{formatMonth(new Date())}</p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Financial Overview</h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard label="Income this month" value={incomeTotals.currentMonth} currency={ctx.currency} icon={ArrowDownCircle} tone="success" />
          <StatCard label="Spent this month" value={expenseTotals.currentMonth} currency={ctx.currency} icon={ArrowUpCircle} tone="danger" />
          <StatCard label="Savings this month" value={monthlySavings} currency={ctx.currency} icon={PiggyBank} tone={monthlySavings >= 0 ? "success" : "danger"} />
          <StatCard
            label="Remaining budget"
            value={remainingBudget}
            currency={ctx.currency}
            icon={Target}
            tone={remainingBudget >= 0 ? "info" : "danger"}
            hint={overallBudget === 0 ? "No overall budget set" : undefined}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Where Your Money Is</h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard label="Cash" value={cashBalance} currency={ctx.currency} icon={Wallet} />
          <StatCard label="Bank & Savings" value={bankBalance} currency={ctx.currency} icon={Landmark} />
          <StatCard label="Total available" value={totalAvailable} currency={ctx.currency} icon={Layers} tone="info" />
          <StatCard label="Planned expenses" value={plannedTotal} currency={ctx.currency} icon={CalendarClock} tone="warning" />
        </div>
      </section>

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm">
            After setting aside <strong>{formatCurrency(plannedTotal, ctx.currency)}</strong> for planned future expenses, you have:
          </p>
          <p className={`text-xl font-bold ${availableAfterPlanned >= 0 ? "text-success" : "text-danger"}`}>
            {formatCurrency(availableAfterPlanned, ctx.currency)}
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentTransactions items={recentItems} currency={ctx.currency} />
        </div>
        <div className="space-y-4">
          <AccountsMiniList accounts={accountBalances} currency={ctx.currency} />
          <BudgetMiniList snapshot={budgetSnapshot} currency={ctx.currency} />
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Signed in as {ctx.email} · {formatDatePeriod(start, end)}
      </p>
    </div>
  );
}

function formatDatePeriod(start: string, end: string) {
  return `Current period: ${start} to ${end}`;
}
