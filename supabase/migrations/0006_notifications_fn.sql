-- =====================================================================
-- public.generate_notifications()
-- Scans every family for the conditions listed in project requirement
-- #19 (budget exceeded/close, upcoming planned expenses, low balances,
-- savings milestones, recurring payments coming soon) and inserts one
-- notification per condition — deduplicated so a daily cron run never
-- spams the same alert (see the NOT EXISTS guard on each INSERT).
-- Intended to be called once a day by /api/cron/recurring alongside
-- generate_due_recurring_transactions(). SECURITY DEFINER + granted
-- only to service_role, same pattern as that function.
-- =====================================================================

create or replace function public.generate_notifications()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count integer := 0;
  n integer;
begin
  -- 1. Budget exceeded (>=100% of a category budget this month)
  insert into public.notifications (family_id, type, severity, title, message, related_entity_type, related_entity_id)
  select b.family_id, 'budget_exceeded', 'danger',
    'Budget exceeded: ' || c.name,
    'You have spent ' || to_char(actual.total, 'FM999,999,990.00') || ' of your ' || to_char(b.amount, 'FM999,999,990.00') || ' ' || c.name || ' budget this month.',
    'budget', b.id
  from public.budgets b
  join public.categories c on c.id = b.category_id
  join lateral (
    select coalesce(sum(t.amount), 0) as total
    from public.transactions t
    where t.family_id = b.family_id and t.type = 'expense' and t.category_id = b.category_id
      and t.txn_date >= b.period_month and t.txn_date < (b.period_month + interval '1 month')
  ) actual on true
  where b.period_month = date_trunc('month', current_date)
    and b.amount > 0
    and actual.total >= b.amount
    and not exists (
      select 1 from public.notifications x
      where x.related_entity_type = 'budget' and x.related_entity_id = b.id and x.type = 'budget_exceeded'
        and x.created_at > now() - interval '3 days'
    );
  get diagnostics n = row_count; inserted_count := inserted_count + n;

  -- 2. Budget warning (90-99% of a category budget this month)
  insert into public.notifications (family_id, type, severity, title, message, related_entity_type, related_entity_id)
  select b.family_id, 'budget_warning', 'warning',
    'Approaching budget limit: ' || c.name,
    'You have used ' || round((actual.total / b.amount) * 100) || '% of your ' || c.name || ' budget this month.',
    'budget', b.id
  from public.budgets b
  join public.categories c on c.id = b.category_id
  join lateral (
    select coalesce(sum(t.amount), 0) as total
    from public.transactions t
    where t.family_id = b.family_id and t.type = 'expense' and t.category_id = b.category_id
      and t.txn_date >= b.period_month and t.txn_date < (b.period_month + interval '1 month')
  ) actual on true
  where b.period_month = date_trunc('month', current_date)
    and b.amount > 0
    and actual.total >= b.amount * 0.9 and actual.total < b.amount
    and not exists (
      select 1 from public.notifications x
      where x.related_entity_type = 'budget' and x.related_entity_id = b.id and x.type = 'budget_warning'
        and x.created_at > now() - interval '3 days'
    );
  get diagnostics n = row_count; inserted_count := inserted_count + n;

  -- 3. Upcoming planned expenses (due within 7 days) — notify once
  insert into public.notifications (family_id, type, severity, title, message, related_entity_type, related_entity_id)
  select p.family_id, 'upcoming_planned_expense', 'info',
    'Upcoming: ' || p.name,
    p.name || ' (' || to_char(p.expected_amount, 'FM999,999,990.00') || ') is expected on ' || to_char(p.expected_date, 'DD Mon YYYY') || '.',
    'planned_expense', p.id
  from public.planned_expenses p
  where p.status = 'planned'
    and p.expected_date between current_date and current_date + interval '7 days'
    and not exists (
      select 1 from public.notifications x
      where x.related_entity_type = 'planned_expense' and x.related_entity_id = p.id and x.type = 'upcoming_planned_expense'
    );
  get diagnostics n = row_count; inserted_count := inserted_count + n;

  -- 4. Low / negative account balance
  insert into public.notifications (family_id, type, severity, title, message, related_entity_type, related_entity_id)
  select ab.family_id, 'low_balance', 'danger',
    'Low balance: ' || ab.name,
    ab.name || ' balance is ' || to_char(ab.current_balance, 'FM999,999,990.00') || '.',
    'account', ab.account_id
  from public.account_balances ab
  where ab.is_active and ab.current_balance < 0
    and not exists (
      select 1 from public.notifications x
      where x.related_entity_type = 'account' and x.related_entity_id = ab.account_id and x.type = 'low_balance'
        and x.created_at > now() - interval '3 days'
    );
  get diagnostics n = row_count; inserted_count := inserted_count + n;

  -- 5. Savings goal completed
  insert into public.notifications (family_id, type, severity, title, message, related_entity_type, related_entity_id)
  select g.family_id, 'savings_progress', 'info',
    'Goal reached: ' || g.name,
    'Congratulations! You have reached your ' || g.name || ' savings goal of ' || to_char(g.target_amount, 'FM999,999,990.00') || '.',
    'savings_goal', g.id
  from public.savings_goals g
  where g.is_active and g.current_amount >= g.target_amount and g.target_amount > 0
    and not exists (
      select 1 from public.notifications x
      where x.related_entity_type = 'savings_goal' and x.related_entity_id = g.id and x.type = 'savings_progress'
    );
  get diagnostics n = row_count; inserted_count := inserted_count + n;

  -- 6. Recurring payment coming soon (due within 3 days)
  insert into public.notifications (family_id, type, severity, title, message, related_entity_type, related_entity_id)
  select r.family_id, 'recurring_due', 'info',
    'Upcoming recurring ' || r.type || ': ' || r.description,
    r.description || ' (' || to_char(r.amount, 'FM999,999,990.00') || ') is due on ' || to_char(r.next_run_date, 'DD Mon YYYY') || '.',
    'recurring_transaction', r.id
  from public.recurring_transactions r
  where r.is_active
    and r.next_run_date between current_date and current_date + interval '3 days'
    and not exists (
      select 1 from public.notifications x
      where x.related_entity_type = 'recurring_transaction' and x.related_entity_id = r.id and x.type = 'recurring_due'
        and x.created_at > now() - interval '3 days'
    );
  get diagnostics n = row_count; inserted_count := inserted_count + n;

  return inserted_count;
end;
$$;

revoke all on function public.generate_notifications() from public, authenticated, anon;
grant execute on function public.generate_notifications() to service_role;
