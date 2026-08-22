import type { AccountBalance, Transaction } from "@/types/database";

/**
 * Central place for every financial calculation in the app (project
 * requirement #26). Keeping this logic in one pure, dependency-free
 * module means the dashboard, analytics, and reports pages can never
 * silently compute the same number two different ways.
 *
 * Ground rules encoded here:
 *   - Transfers are NEVER income or expense.
 *   - "Available balance" always comes from actual account balances
 *     (opening + real transactions + real transfers), never from
 *     budgeted or planned figures.
 *   - Budgeted, planned, and actual money are kept in separate
 *     functions/return shapes so callers can't accidentally blend them.
 */

export interface MonthlySummary {
  totalIncome: number;
  totalExpense: number;
  netSavings: number; // income - expense, for the period
}

export function summarizeTransactions(transactions: Pick<Transaction, "type" | "amount">[]): MonthlySummary {
  let totalIncome = 0;
  let totalExpense = 0;
  for (const t of transactions) {
    if (t.type === "income") totalIncome += Number(t.amount);
    else totalExpense += Number(t.amount);
  }
  return { totalIncome, totalExpense, netSavings: totalIncome - totalExpense };
}

/** Cash balance = sum of current_balance across accounts of type 'cash'. */
export function sumBalancesByType(balances: AccountBalance[], types: string[]) {
  return balances
    .filter((b) => types.includes(b.type))
    .reduce((sum, b) => sum + Number(b.current_balance), 0);
}

/** Total available money across every active account. */
export function totalAvailableBalance(balances: AccountBalance[]) {
  return balances.filter((b) => b.is_active).reduce((sum, b) => sum + Number(b.current_balance), 0);
}

export interface CategoryBudgetProgress {
  categoryId: string | null;
  budgeted: number;
  actual: number;
  remaining: number;
  percentUsed: number;
  overBy: number;
}

export function budgetProgress(budgeted: number, actual: number): CategoryBudgetProgress {
  const remaining = budgeted - actual;
  const percentUsed = budgeted > 0 ? Math.round((actual / budgeted) * 1000) / 10 : actual > 0 ? 100 : 0;
  return {
    categoryId: null,
    budgeted,
    actual,
    remaining,
    percentUsed,
    overBy: remaining < 0 ? Math.abs(remaining) : 0,
  };
}

/** Remaining monthly budget = overall monthly budget - actual eligible expenses. */
export function remainingMonthlyBudget(overallBudget: number, actualExpenses: number) {
  return overallBudget - actualExpenses;
}

export interface PlannedRemaining {
  expectedIncome: number;
  essentialTotal: number;
  flexibleTotal: number;
  plannedExpensesTotal: number;
  savingsTarget: number;
  remaining: number;
  isDeficit: boolean;
}

export function computePlannedRemaining(input: {
  expectedIncome: number;
  essentialExpenses: Record<string, number>;
  flexibleExpenses: Record<string, number>;
  plannedExpensesTotal: number;
  savingsTarget: number;
}): PlannedRemaining {
  const essentialTotal = Object.values(input.essentialExpenses).reduce((a, b) => a + Number(b || 0), 0);
  const flexibleTotal = Object.values(input.flexibleExpenses).reduce((a, b) => a + Number(b || 0), 0);
  const remaining =
    input.expectedIncome - essentialTotal - flexibleTotal - input.plannedExpensesTotal - input.savingsTarget;
  return {
    expectedIncome: input.expectedIncome,
    essentialTotal,
    flexibleTotal,
    plannedExpensesTotal: input.plannedExpensesTotal,
    savingsTarget: input.savingsTarget,
    remaining,
    isDeficit: remaining < 0,
  };
}

export function savingsGoalProgress(current: number, target: number) {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((current / target) * 1000) / 10);
}

export function projectedCompletionDate(
  current: number,
  target: number,
  monthlyContribution: number
): Date | null {
  if (monthlyContribution <= 0 || current >= target) return null;
  const monthsNeeded = Math.ceil((target - current) / monthlyContribution);
  const d = new Date();
  d.setMonth(d.getMonth() + monthsNeeded);
  return d;
}

export function averageDailySpending(totalSpending: number, daysInRange: number) {
  if (daysInRange <= 0) return 0;
  return totalSpending / daysInRange;
}

export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null; // undefined % change from zero
  return Math.round(((current - previous) / previous) * 1000) / 10;
}
