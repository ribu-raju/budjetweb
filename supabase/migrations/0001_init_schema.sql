-- =====================================================================
-- Riburaju Family Budget — Initial Schema
-- =====================================================================
-- This migration creates every table the application needs. It does
-- NOT enable Row Level Security policies (see 0003_rls_policies.sql)
-- or helper functions/triggers (see 0002_functions_triggers.sql).
-- Run migrations in numeric order.
-- =====================================================================

create extension if not exists "pgcrypto";
create extension if not exists "citext"; -- case-insensitive email matching (invites, login_attempts)

-- ---------------------------------------------------------------------
-- families: one row per household using the app
-- ---------------------------------------------------------------------
create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  currency text not null default 'AED',
  fiscal_month_start_day smallint not null default 1 check (fiscal_month_start_day between 1 and 28),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.families is 'A household / family unit. All financial data is scoped to a family.';

-- ---------------------------------------------------------------------
-- family_members: links a Supabase auth user to a family, with a role
-- ---------------------------------------------------------------------
create table if not exists public.family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  display_name text not null,
  status text not null default 'active' check (status in ('active', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

comment on table public.family_members is 'One row per user per family. unique(user_id) means each login belongs to exactly one family in this build.';

create index if not exists idx_family_members_family on public.family_members(family_id);

-- ---------------------------------------------------------------------
-- invites: controlled registration. Only someone holding a valid,
-- unexpired token can create an account, and only for the family/role
-- the admin specified.
-- ---------------------------------------------------------------------
create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  email citext not null,
  role text not null default 'member' check (role in ('admin', 'member')),
  token uuid not null default gen_random_uuid(),
  invited_by uuid references auth.users(id),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_invites_token on public.invites(token);
create index if not exists idx_invites_family on public.invites(family_id);

-- ---------------------------------------------------------------------
-- accounts: cash wallet, bank accounts, credit cards, etc.
-- ---------------------------------------------------------------------
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null,
  type text not null check (type in ('cash', 'bank', 'savings', 'credit_card', 'other')),
  opening_balance numeric(14,2) not null default 0,
  currency text not null default 'AED',
  description text,
  is_active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_accounts_family on public.accounts(family_id);

-- ---------------------------------------------------------------------
-- categories & subcategories
-- ---------------------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null,
  type text not null check (type in ('income', 'expense')),
  icon text not null default 'circle',
  color text not null default '#6366f1',
  is_default boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (family_id, name, type)
);

create index if not exists idx_categories_family on public.categories(family_id);

create table if not exists public.subcategories (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (category_id, name)
);

create index if not exists idx_subcategories_category on public.subcategories(category_id);

-- ---------------------------------------------------------------------
-- transactions: income and expense records
-- ---------------------------------------------------------------------
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  amount numeric(14,2) not null check (amount > 0),
  txn_date date not null default current_date,
  account_id uuid not null references public.accounts(id) on delete restrict,
  category_id uuid references public.categories(id) on delete set null,
  subcategory_id uuid references public.subcategories(id) on delete set null,
  income_source text, -- e.g. Salary, Freelance, Business, Bonus, Rental, Investment, Other (income only)
  payment_method text, -- e.g. Cash, Debit Card, Credit Card, Bank Transfer, UPI (expense only)
  description text,
  notes text,
  receipt_path text, -- storage path in the 'receipts' bucket, not a public URL
  recurring_transaction_id uuid, -- set if generated from a recurring rule (FK added after that table exists)
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_transactions_family_date on public.transactions(family_id, txn_date desc);
create index if not exists idx_transactions_account on public.transactions(account_id);
create index if not exists idx_transactions_category on public.transactions(category_id);
create index if not exists idx_transactions_created_by on public.transactions(created_by);
create index if not exists idx_transactions_family_type_date on public.transactions(family_id, type, txn_date desc);

-- ---------------------------------------------------------------------
-- transfers: money moved between two of the family's own accounts.
-- Never counted as income or expense.
-- ---------------------------------------------------------------------
create table if not exists public.transfers (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  from_account_id uuid not null references public.accounts(id) on delete restrict,
  to_account_id uuid not null references public.accounts(id) on delete restrict,
  amount numeric(14,2) not null check (amount > 0),
  transfer_date date not null default current_date,
  note text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  constraint chk_transfer_accounts_differ check (from_account_id <> to_account_id)
);

create index if not exists idx_transfers_family_date on public.transfers(family_id, transfer_date desc);

-- ---------------------------------------------------------------------
-- budgets: monthly budget per category (category_id null = overall)
-- ---------------------------------------------------------------------
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  period_month date not null, -- always the 1st of the month, e.g. 2026-08-01
  category_id uuid references public.categories(id) on delete cascade,
  amount numeric(14,2) not null check (amount >= 0),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (family_id, period_month, category_id)
);

create index if not exists idx_budgets_family_period on public.budgets(family_id, period_month);

-- The table-level unique(family_id, period_month, category_id) above
-- does NOT stop two "overall" (category_id null) budgets in the same
-- month, because SQL treats NULL <> NULL. This partial index closes
-- that gap explicitly.
create unique index if not exists idx_budgets_one_overall_per_month
  on public.budgets(family_id, period_month) where category_id is null;

-- ---------------------------------------------------------------------
-- savings_goals + contributions
-- ---------------------------------------------------------------------
create table if not exists public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null,
  target_amount numeric(14,2) not null check (target_amount > 0),
  current_amount numeric(14,2) not null default 0,
  target_date date,
  account_id uuid references public.accounts(id) on delete set null,
  is_active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_savings_goals_family on public.savings_goals(family_id);

create table if not exists public.savings_contributions (
  id uuid primary key default gen_random_uuid(),
  savings_goal_id uuid not null references public.savings_goals(id) on delete cascade,
  family_id uuid not null references public.families(id) on delete cascade,
  amount numeric(14,2) not null check (amount <> 0),
  contribution_date date not null default current_date,
  note text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_savings_contrib_goal on public.savings_contributions(savings_goal_id);

-- ---------------------------------------------------------------------
-- planned_expenses: future/anticipated spending not yet incurred
-- ---------------------------------------------------------------------
create table if not exists public.planned_expenses (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null,
  expected_amount numeric(14,2) not null check (expected_amount > 0),
  expected_date date not null,
  category_id uuid references public.categories(id) on delete set null,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  account_id uuid references public.accounts(id) on delete set null,
  status text not null default 'planned' check (status in ('planned', 'completed', 'cancelled')),
  actual_transaction_id uuid references public.transactions(id) on delete set null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_planned_expenses_family_date on public.planned_expenses(family_id, expected_date);

-- ---------------------------------------------------------------------
-- recurring_transactions: rules that generate income/expense entries
-- ---------------------------------------------------------------------
create table if not exists public.recurring_transactions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  amount numeric(14,2) not null check (amount > 0),
  account_id uuid not null references public.accounts(id) on delete restrict,
  category_id uuid references public.categories(id) on delete set null,
  subcategory_id uuid references public.subcategories(id) on delete set null,
  description text not null,
  frequency text not null check (frequency in ('weekly', 'monthly', 'quarterly', 'yearly')),
  start_date date not null,
  end_date date,
  next_run_date date not null,
  last_generated_date date,
  is_active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_recurring_family_active on public.recurring_transactions(family_id, is_active);
create index if not exists idx_recurring_next_run on public.recurring_transactions(next_run_date) where is_active;

alter table public.transactions
  add constraint fk_transactions_recurring
  foreign key (recurring_transaction_id) references public.recurring_transactions(id) on delete set null;

-- ---------------------------------------------------------------------
-- budget_plans: snapshots produced by the Budget Planner wizard
-- ---------------------------------------------------------------------
create table if not exists public.budget_plans (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null default 'Monthly Plan',
  plan_month date not null,
  expected_salary numeric(14,2) not null default 0,
  expected_other_income numeric(14,2) not null default 0,
  essential_expenses jsonb not null default '{}'::jsonb, -- {rent: 0, utilities: 0, food: 0, transportation: 0, education: 0, insurance: 0, loan_payments: 0, other: 0}
  flexible_expenses jsonb not null default '{}'::jsonb,   -- {shopping: 0, entertainment: 0, dining: 0, travel: 0, hobbies: 0, personal: 0}
  savings_target numeric(14,2) not null default 0,
  emergency_fund_target numeric(14,2) not null default 0,
  investment_target numeric(14,2) not null default 0,
  other_savings_goals jsonb not null default '[]'::jsonb,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (family_id, plan_month)
);

create index if not exists idx_budget_plans_family on public.budget_plans(family_id);

-- ---------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade, -- null = visible to whole family
  type text not null, -- budget_exceeded, budget_warning, upcoming_planned_expense, low_balance, savings_progress, recurring_due
  severity text not null default 'info' check (severity in ('info', 'warning', 'danger')),
  title text not null,
  message text not null,
  related_entity_type text,
  related_entity_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_family_user on public.notifications(family_id, user_id, is_read);

-- ---------------------------------------------------------------------
-- audit_logs: who changed what (admin visibility, accountability)
-- ---------------------------------------------------------------------
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid references auth.users(id),
  action text not null, -- insert, update, delete
  entity_type text not null,
  entity_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_family on public.audit_logs(family_id, created_at desc);

-- ---------------------------------------------------------------------
-- login_attempts: basic brute-force protection support
-- ---------------------------------------------------------------------
create table if not exists public.login_attempts (
  id bigint generated always as identity primary key,
  email citext not null,
  ip_address text,
  succeeded boolean not null,
  attempted_at timestamptz not null default now()
);

create index if not exists idx_login_attempts_email_time on public.login_attempts(email, attempted_at desc);
