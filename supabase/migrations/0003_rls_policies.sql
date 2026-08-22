-- =====================================================================
-- Riburaju Family Budget — Row Level Security
-- Every table is scoped to the caller's family via current_family_id().
-- Nothing in this app is readable without an authenticated session in
-- an active family_members row. Service-role (server-only) operations
-- bypass RLS by design (invite acceptance, admin bootstrap, recurring
-- transaction generation) and never run in the browser.
-- =====================================================================

alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.invites enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.subcategories enable row level security;
alter table public.transactions enable row level security;
alter table public.transfers enable row level security;
alter table public.budgets enable row level security;
alter table public.budget_plans enable row level security;
alter table public.savings_goals enable row level security;
alter table public.savings_contributions enable row level security;
alter table public.planned_expenses enable row level security;
alter table public.recurring_transactions enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;
alter table public.login_attempts enable row level security;

-- ---------------------------------------------------------------------
-- families
-- ---------------------------------------------------------------------
create policy "family_select_own" on public.families
  for select using (id = public.current_family_id());

create policy "family_update_admin" on public.families
  for update using (id = public.current_family_id() and public.is_admin())
  with check (id = public.current_family_id() and public.is_admin());

-- no client-side insert/delete: families are created only by the
-- server-side bootstrap route using the service role key.

-- ---------------------------------------------------------------------
-- family_members
-- ---------------------------------------------------------------------
create policy "members_select_same_family" on public.family_members
  for select using (family_id = public.current_family_id());

create policy "members_update_self_or_admin" on public.family_members
  for update using (
    family_id = public.current_family_id()
    and (user_id = auth.uid() or public.is_admin())
  )
  with check (
    family_id = public.current_family_id()
    and (user_id = auth.uid() or public.is_admin())
  );

create policy "members_delete_admin" on public.family_members
  for delete using (family_id = public.current_family_id() and public.is_admin());

-- inserts happen server-side (service role) when an invite is accepted.

-- ---------------------------------------------------------------------
-- invites (admin only, own family)
-- ---------------------------------------------------------------------
create policy "invites_all_admin" on public.invites
  for all using (family_id = public.current_family_id() and public.is_admin())
  with check (family_id = public.current_family_id() and public.is_admin());

-- ---------------------------------------------------------------------
-- accounts: members can view; only admins create/edit/delete
-- ---------------------------------------------------------------------
create policy "accounts_select_family" on public.accounts
  for select using (family_id = public.current_family_id());

create policy "accounts_write_admin" on public.accounts
  for insert with check (family_id = public.current_family_id() and public.is_admin());

create policy "accounts_update_admin" on public.accounts
  for update using (family_id = public.current_family_id() and public.is_admin())
  with check (family_id = public.current_family_id() and public.is_admin());

create policy "accounts_delete_admin" on public.accounts
  for delete using (family_id = public.current_family_id() and public.is_admin());

-- ---------------------------------------------------------------------
-- categories & subcategories: members view; only admins manage
-- ---------------------------------------------------------------------
create policy "categories_select_family" on public.categories
  for select using (family_id = public.current_family_id());

create policy "categories_insert_admin" on public.categories
  for insert with check (family_id = public.current_family_id() and public.is_admin());

create policy "categories_update_admin" on public.categories
  for update using (family_id = public.current_family_id() and public.is_admin())
  with check (family_id = public.current_family_id() and public.is_admin());

create policy "categories_delete_admin" on public.categories
  for delete using (family_id = public.current_family_id() and public.is_admin());

create policy "subcategories_select_family" on public.subcategories
  for select using (family_id = public.current_family_id());

create policy "subcategories_insert_admin" on public.subcategories
  for insert with check (family_id = public.current_family_id() and public.is_admin());

create policy "subcategories_update_admin" on public.subcategories
  for update using (family_id = public.current_family_id() and public.is_admin())
  with check (family_id = public.current_family_id() and public.is_admin());

create policy "subcategories_delete_admin" on public.subcategories
  for delete using (family_id = public.current_family_id() and public.is_admin());

-- ---------------------------------------------------------------------
-- transactions: any active member can view family data and add
-- transactions; editing/deleting is limited to the creator or an admin
-- ---------------------------------------------------------------------
create policy "transactions_select_family" on public.transactions
  for select using (family_id = public.current_family_id());

create policy "transactions_insert_member" on public.transactions
  for insert with check (
    family_id = public.current_family_id()
    and created_by = auth.uid()
  );

create policy "transactions_update_own_or_admin" on public.transactions
  for update using (
    family_id = public.current_family_id()
    and (created_by = auth.uid() or public.is_admin())
  )
  with check (
    family_id = public.current_family_id()
    and (created_by = auth.uid() or public.is_admin())
  );

create policy "transactions_delete_own_or_admin" on public.transactions
  for delete using (
    family_id = public.current_family_id()
    and (created_by = auth.uid() or public.is_admin())
  );

-- ---------------------------------------------------------------------
-- transfers: same own-or-admin pattern; never counted as income/expense
-- by application logic (see lib/calculations.ts)
-- ---------------------------------------------------------------------
create policy "transfers_select_family" on public.transfers
  for select using (family_id = public.current_family_id());

create policy "transfers_insert_member" on public.transfers
  for insert with check (
    family_id = public.current_family_id()
    and created_by = auth.uid()
  );

create policy "transfers_update_own_or_admin" on public.transfers
  for update using (
    family_id = public.current_family_id()
    and (created_by = auth.uid() or public.is_admin())
  )
  with check (
    family_id = public.current_family_id()
    and (created_by = auth.uid() or public.is_admin())
  );

create policy "transfers_delete_own_or_admin" on public.transfers
  for delete using (
    family_id = public.current_family_id()
    and (created_by = auth.uid() or public.is_admin())
  );

-- ---------------------------------------------------------------------
-- budgets: members view; only admins set budgets
-- ---------------------------------------------------------------------
create policy "budgets_select_family" on public.budgets
  for select using (family_id = public.current_family_id());

create policy "budgets_insert_admin" on public.budgets
  for insert with check (family_id = public.current_family_id() and public.is_admin());

create policy "budgets_update_admin" on public.budgets
  for update using (family_id = public.current_family_id() and public.is_admin())
  with check (family_id = public.current_family_id() and public.is_admin());

create policy "budgets_delete_admin" on public.budgets
  for delete using (family_id = public.current_family_id() and public.is_admin());

-- ---------------------------------------------------------------------
-- budget_plans: any member can draft a plan; own-or-admin to edit
-- ---------------------------------------------------------------------
create policy "budget_plans_select_family" on public.budget_plans
  for select using (family_id = public.current_family_id());

create policy "budget_plans_insert_member" on public.budget_plans
  for insert with check (family_id = public.current_family_id() and created_by = auth.uid());

create policy "budget_plans_update_own_or_admin" on public.budget_plans
  for update using (family_id = public.current_family_id() and (created_by = auth.uid() or public.is_admin()))
  with check (family_id = public.current_family_id() and (created_by = auth.uid() or public.is_admin()));

create policy "budget_plans_delete_own_or_admin" on public.budget_plans
  for delete using (family_id = public.current_family_id() and (created_by = auth.uid() or public.is_admin()));

-- ---------------------------------------------------------------------
-- savings_goals & contributions
-- ---------------------------------------------------------------------
create policy "savings_goals_select_family" on public.savings_goals
  for select using (family_id = public.current_family_id());

create policy "savings_goals_insert_member" on public.savings_goals
  for insert with check (family_id = public.current_family_id() and created_by = auth.uid());

create policy "savings_goals_update_own_or_admin" on public.savings_goals
  for update using (family_id = public.current_family_id() and (created_by = auth.uid() or public.is_admin()))
  with check (family_id = public.current_family_id() and (created_by = auth.uid() or public.is_admin()));

create policy "savings_goals_delete_own_or_admin" on public.savings_goals
  for delete using (family_id = public.current_family_id() and (created_by = auth.uid() or public.is_admin()));

create policy "savings_contrib_select_family" on public.savings_contributions
  for select using (family_id = public.current_family_id());

create policy "savings_contrib_insert_member" on public.savings_contributions
  for insert with check (family_id = public.current_family_id() and created_by = auth.uid());

create policy "savings_contrib_update_own_or_admin" on public.savings_contributions
  for update using (family_id = public.current_family_id() and (created_by = auth.uid() or public.is_admin()))
  with check (family_id = public.current_family_id() and (created_by = auth.uid() or public.is_admin()));

create policy "savings_contrib_delete_own_or_admin" on public.savings_contributions
  for delete using (family_id = public.current_family_id() and (created_by = auth.uid() or public.is_admin()));

-- ---------------------------------------------------------------------
-- planned_expenses
-- ---------------------------------------------------------------------
create policy "planned_expenses_select_family" on public.planned_expenses
  for select using (family_id = public.current_family_id());

create policy "planned_expenses_insert_member" on public.planned_expenses
  for insert with check (family_id = public.current_family_id() and created_by = auth.uid());

create policy "planned_expenses_update_own_or_admin" on public.planned_expenses
  for update using (family_id = public.current_family_id() and (created_by = auth.uid() or public.is_admin()))
  with check (family_id = public.current_family_id() and (created_by = auth.uid() or public.is_admin()));

create policy "planned_expenses_delete_own_or_admin" on public.planned_expenses
  for delete using (family_id = public.current_family_id() and (created_by = auth.uid() or public.is_admin()));

-- ---------------------------------------------------------------------
-- recurring_transactions
-- ---------------------------------------------------------------------
create policy "recurring_select_family" on public.recurring_transactions
  for select using (family_id = public.current_family_id());

create policy "recurring_insert_member" on public.recurring_transactions
  for insert with check (family_id = public.current_family_id() and created_by = auth.uid());

create policy "recurring_update_own_or_admin" on public.recurring_transactions
  for update using (family_id = public.current_family_id() and (created_by = auth.uid() or public.is_admin()))
  with check (family_id = public.current_family_id() and (created_by = auth.uid() or public.is_admin()));

create policy "recurring_delete_own_or_admin" on public.recurring_transactions
  for delete using (family_id = public.current_family_id() and (created_by = auth.uid() or public.is_admin()));

-- ---------------------------------------------------------------------
-- notifications: visible if addressed to the user or to the whole
-- family; a member may only mark their own as read; creation is
-- self-scoped to the caller's own family (can't spam another family)
-- ---------------------------------------------------------------------
create policy "notifications_select_family" on public.notifications
  for select using (
    family_id = public.current_family_id()
    and (user_id is null or user_id = auth.uid())
  );

create policy "notifications_insert_family" on public.notifications
  for insert with check (family_id = public.current_family_id());

create policy "notifications_update_own" on public.notifications
  for update using (family_id = public.current_family_id() and (user_id = auth.uid() or user_id is null))
  with check (family_id = public.current_family_id());

create policy "notifications_delete_admin" on public.notifications
  for delete using (family_id = public.current_family_id() and public.is_admin());

-- ---------------------------------------------------------------------
-- audit_logs: admin-only read, no direct client writes (the trigger
-- function is SECURITY DEFINER and bypasses RLS to insert)
-- ---------------------------------------------------------------------
create policy "audit_logs_select_admin" on public.audit_logs
  for select using (family_id = public.current_family_id() and public.is_admin());

-- ---------------------------------------------------------------------
-- login_attempts: no client access whatsoever; only the service role
-- (used from the login API route) reads/writes this table.
-- ---------------------------------------------------------------------
-- (no policies defined => authenticated/anon get zero access; service_role
-- bypasses RLS entirely, which is what the login route relies on)
