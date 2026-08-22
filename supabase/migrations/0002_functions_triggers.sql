-- =====================================================================
-- Riburaju Family Budget — Helper functions, views, triggers
-- =====================================================================

-- ---------------------------------------------------------------------
-- current_family_id(): the family the logged-in user belongs to.
-- SECURITY DEFINER so it can read family_members without recursing
-- through that table's own RLS policies (which call this function).
-- ---------------------------------------------------------------------
create or replace function public.current_family_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select family_id
  from public.family_members
  where user_id = auth.uid()
    and status = 'active'
  limit 1;
$$;

-- ---------------------------------------------------------------------
-- is_admin(): true if the logged-in user is an admin of their family
-- ---------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.family_members
    where user_id = auth.uid()
      and status = 'active'
      and role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------
-- generic updated_at trigger
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['families','family_members','accounts','budgets','savings_goals',
                            'planned_expenses','recurring_transactions','budget_plans','transactions']
  loop
    execute format(
      'drop trigger if exists trg_%1$s_updated_at on public.%1$s;
       create trigger trg_%1$s_updated_at before update on public.%1$s
       for each row execute function public.set_updated_at();', t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- account_balances view — computed, never manually edited.
--   balance = opening_balance
--           + income into the account
--           - expenses from the account
--           + transfers in
--           - transfers out
-- security_invoker means the view respects the querying user's RLS,
-- so a member can never see another family's balances through it.
-- ---------------------------------------------------------------------
create or replace view public.account_balances
with (security_invoker = true) as
select
  a.id as account_id,
  a.family_id,
  a.name,
  a.type,
  a.currency,
  a.description,
  a.is_active,
  a.opening_balance,
  coalesce(income.total, 0) as total_income,
  coalesce(expense.total, 0) as total_expense,
  coalesce(transfer_in.total, 0) as total_transfer_in,
  coalesce(transfer_out.total, 0) as total_transfer_out,
  a.opening_balance
    + coalesce(income.total, 0)
    - coalesce(expense.total, 0)
    + coalesce(transfer_in.total, 0)
    - coalesce(transfer_out.total, 0) as current_balance
from public.accounts a
left join (
  select account_id, sum(amount) as total
  from public.transactions
  where type = 'income'
  group by account_id
) income on income.account_id = a.id
left join (
  select account_id, sum(amount) as total
  from public.transactions
  where type = 'expense'
  group by account_id
) expense on expense.account_id = a.id
left join (
  select to_account_id as account_id, sum(amount) as total
  from public.transfers
  group by to_account_id
) transfer_in on transfer_in.account_id = a.id
left join (
  select from_account_id as account_id, sum(amount) as total
  from public.transfers
  group by from_account_id
) transfer_out on transfer_out.account_id = a.id;

-- ---------------------------------------------------------------------
-- savings_contributions -> keep savings_goals.current_amount in sync
-- ---------------------------------------------------------------------
create or replace function public.apply_savings_contribution()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    update public.savings_goals
      set current_amount = current_amount + new.amount
      where id = new.savings_goal_id;
  elsif TG_OP = 'UPDATE' then
    update public.savings_goals
      set current_amount = current_amount - old.amount + new.amount
      where id = new.savings_goal_id;
  elsif TG_OP = 'DELETE' then
    update public.savings_goals
      set current_amount = current_amount - old.amount
      where id = old.savings_goal_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_savings_contribution on public.savings_contributions;
create trigger trg_savings_contribution
  after insert or update or delete on public.savings_contributions
  for each row execute function public.apply_savings_contribution();

-- ---------------------------------------------------------------------
-- audit logging — captures inserts/updates/deletes on financial tables
-- ---------------------------------------------------------------------
create or replace function public.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  fam_id uuid;
begin
  fam_id := coalesce(new.family_id, old.family_id);
  insert into public.audit_logs (family_id, user_id, action, entity_type, entity_id, old_data, new_data)
  values (
    fam_id,
    auth.uid(),
    lower(TG_OP),
    TG_TABLE_NAME,
    coalesce(new.id, old.id),
    case when TG_OP in ('UPDATE','DELETE') then to_jsonb(old) else null end,
    case when TG_OP in ('UPDATE','INSERT') then to_jsonb(new) else null end
  );
  return coalesce(new, old);
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['transactions','transfers','budgets','accounts','savings_goals','planned_expenses']
  loop
    execute format(
      'drop trigger if exists trg_%1$s_audit on public.%1$s;
       create trigger trg_%1$s_audit after insert or update or delete on public.%1$s
       for each row execute function public.write_audit_log();', t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- recurring transaction generation
-- Advances each due rule and inserts the corresponding transaction.
-- Idempotent per call: only rules whose next_run_date <= target_date
-- fire, and next_run_date is advanced immediately, so re-running the
-- function the same day never double-inserts.
-- Intended to be invoked by a trusted server context (service role)
-- via RPC from a daily scheduled job — see /api/cron/recurring.
-- ---------------------------------------------------------------------
create or replace function public.generate_due_recurring_transactions(target_date date default current_date)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  inserted_count integer := 0;
  new_next_date date;
begin
  for r in
    select * from public.recurring_transactions
    where is_active = true
      and next_run_date <= target_date
      and (end_date is null or next_run_date <= end_date)
    order by next_run_date
  loop
    insert into public.transactions (
      family_id, type, amount, txn_date, account_id, category_id, subcategory_id,
      description, recurring_transaction_id, created_by
    ) values (
      r.family_id, r.type, r.amount, r.next_run_date, r.account_id, r.category_id, r.subcategory_id,
      r.description, r.id,
      coalesce(r.created_by, (select user_id from public.family_members where family_id = r.family_id and role = 'admin' limit 1))
    );

    inserted_count := inserted_count + 1;

    new_next_date := case r.frequency
      when 'weekly' then r.next_run_date + interval '7 days'
      when 'monthly' then r.next_run_date + interval '1 month'
      when 'quarterly' then r.next_run_date + interval '3 months'
      when 'yearly' then r.next_run_date + interval '1 year'
    end;

    update public.recurring_transactions
      set last_generated_date = r.next_run_date,
          next_run_date = new_next_date,
          is_active = case when r.end_date is not null and new_next_date > r.end_date then false else is_active end
      where id = r.id;
  end loop;

  return inserted_count;
end;
$$;

revoke all on function public.generate_due_recurring_transactions(date) from public, authenticated, anon;
grant execute on function public.generate_due_recurring_transactions(date) to service_role;
