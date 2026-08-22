// Hand-written types matching supabase/migrations/*.sql.
// For a fully generated, always-in-sync version once your project is
// live, run:
//   npx supabase gen types typescript --project-id YOUR_PROJECT_REF > src/types/database.ts
// (see README "Keeping types in sync"). This hand-written version is
// enough to develop against and keeps the repo buildable with zero
// Supabase project connected.

export type Role = "admin" | "member";
export type AccountType = "cash" | "bank" | "savings" | "credit_card" | "other";
export type TransactionType = "income" | "expense";
export type Frequency = "weekly" | "monthly" | "quarterly" | "yearly";
export type Priority = "low" | "medium" | "high";
export type PlannedStatus = "planned" | "completed" | "cancelled";
export type NotificationSeverity = "info" | "warning" | "danger";

export interface Family {
  id: string;
  name: string;
  currency: string;
  fiscal_month_start_day: number;
  created_at: string;
  updated_at: string;
}

export interface FamilyMember {
  id: string;
  family_id: string;
  user_id: string;
  role: Role;
  display_name: string;
  status: "active" | "disabled";
  created_at: string;
  updated_at: string;
}

export interface Invite {
  id: string;
  family_id: string;
  email: string;
  role: Role;
  token: string;
  invited_by: string | null;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

export interface Account {
  id: string;
  family_id: string;
  name: string;
  type: AccountType;
  opening_balance: number;
  currency: string;
  description: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AccountBalance {
  account_id: string;
  family_id: string;
  name: string;
  type: AccountType;
  currency: string;
  description: string | null;
  is_active: boolean;
  opening_balance: number;
  total_income: number;
  total_expense: number;
  total_transfer_in: number;
  total_transfer_out: number;
  current_balance: number;
}

export interface Category {
  id: string;
  family_id: string;
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
  is_default: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface Subcategory {
  id: string;
  category_id: string;
  family_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface Transaction {
  id: string;
  family_id: string;
  type: TransactionType;
  amount: number;
  txn_date: string;
  account_id: string;
  category_id: string | null;
  subcategory_id: string | null;
  income_source: string | null;
  payment_method: string | null;
  description: string | null;
  notes: string | null;
  receipt_path: string | null;
  recurring_transaction_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Transfer {
  id: string;
  family_id: string;
  from_account_id: string;
  to_account_id: string;
  amount: number;
  transfer_date: string;
  note: string | null;
  created_by: string;
  created_at: string;
}

export interface Budget {
  id: string;
  family_id: string;
  period_month: string;
  category_id: string | null;
  amount: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BudgetPlan {
  id: string;
  family_id: string;
  name: string;
  plan_month: string;
  expected_salary: number;
  expected_other_income: number;
  essential_expenses: Record<string, number>;
  flexible_expenses: Record<string, number>;
  savings_target: number;
  emergency_fund_target: number;
  investment_target: number;
  other_savings_goals: { name: string; amount: number }[];
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SavingsGoal {
  id: string;
  family_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  account_id: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SavingsContribution {
  id: string;
  savings_goal_id: string;
  family_id: string;
  amount: number;
  contribution_date: string;
  note: string | null;
  created_by: string | null;
  created_at: string;
}

export interface PlannedExpense {
  id: string;
  family_id: string;
  name: string;
  expected_amount: number;
  expected_date: string;
  category_id: string | null;
  priority: Priority;
  account_id: string | null;
  status: PlannedStatus;
  actual_transaction_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecurringTransaction {
  id: string;
  family_id: string;
  type: TransactionType;
  amount: number;
  account_id: string;
  category_id: string | null;
  subcategory_id: string | null;
  description: string;
  frequency: Frequency;
  start_date: string;
  end_date: string | null;
  next_run_date: string;
  last_generated_date: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  family_id: string;
  user_id: string | null;
  type: string;
  severity: NotificationSeverity;
  title: string;
  message: string;
  related_entity_type: string | null;
  related_entity_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  family_id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
}

// Minimal Database shape so `createClient<Database>()` type-checks.
// Only the columns above are enforced at the app layer via Zod; this
// generic passthrough keeps the Supabase client ergonomic without a
// full generated schema.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;
