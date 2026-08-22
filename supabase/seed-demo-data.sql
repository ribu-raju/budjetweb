-- =====================================================================
-- DEMO / SAMPLE DATA — OPTIONAL, NOT PART OF THE MIGRATION CHAIN
-- =====================================================================
-- This script is NOT auto-run by `supabase db push` or the migration
-- chain. Run it by hand only if you want realistic sample data to
-- explore the app with (development or a demo deployment).
--
-- It creates, INSIDE YOUR OWN FAMILY (found by the admin email you set
-- below — run the bootstrap-admin flow from the README FIRST so that
-- family/admin already exists):
--   - default categories (skipped if you already have them)
--   - 3 accounts (Cash Wallet, Main Bank, Savings)
--   - ~2 months of sample income/expense transactions
--   - one budget set for the current month
--   - two savings goals
--   - two planned expenses
--
-- TO REMOVE demo data later, delete the rows this script created (by
-- description/name, or simply delete the accounts it made — deleting
-- an account is blocked while transactions reference it, so delete the
-- transactions first, then the accounts/goals/planned expenses).
-- =====================================================================

do $$
declare
  admin_email text := 'CHANGE-ME@example.com'; -- <-- set this to your admin login email before running
  fam_id uuid;
  member_user_id uuid;
  cash_id uuid;
  bank_id uuid;
  savings_id uuid;
  cat_groceries uuid;
  cat_restaurants uuid;
  cat_fuel uuid;
  cat_entertainment uuid;
  cat_shopping uuid;
  cat_salary uuid;
  cat_freelance uuid;
  d date;
begin
  select fm.family_id, fm.user_id into fam_id, member_user_id
  from public.family_members fm
  join auth.users u on u.id = fm.user_id
  where u.email = admin_email
  limit 1;

  if fam_id is null then
    raise exception 'No family found for admin_email=%. Create your admin account first (see README bootstrap step), then edit admin_email at the top of this script.', admin_email;
  end if;

  perform public.seed_default_categories(fam_id);

  insert into public.accounts (family_id, name, type, opening_balance, currency)
  values (fam_id, 'Cash Wallet', 'cash', 1000, 'AED') returning id into cash_id;

  insert into public.accounts (family_id, name, type, opening_balance, currency)
  values (fam_id, 'Main Bank Account', 'bank', 10000, 'AED') returning id into bank_id;

  insert into public.accounts (family_id, name, type, opening_balance, currency)
  values (fam_id, 'Savings Account', 'savings', 5000, 'AED') returning id into savings_id;

  select id into cat_groceries from public.categories where family_id = fam_id and name = 'Food' and type='expense';
  select id into cat_fuel from public.categories where family_id = fam_id and name = 'Transportation' and type='expense';
  select id into cat_entertainment from public.categories where family_id = fam_id and name = 'Lifestyle' and type='expense';
  select id into cat_shopping from public.categories where family_id = fam_id and name = 'Lifestyle' and type='expense';
  select id into cat_salary from public.categories where family_id = fam_id and name = 'Salary' and type='income';
  select id into cat_freelance from public.categories where family_id = fam_id and name = 'Freelance' and type='income';

  -- Salary income for current and previous month
  for d in select generate_series(date_trunc('month', current_date) - interval '1 month', date_trunc('month', current_date), interval '1 month')::date
  loop
    insert into public.transactions (family_id, type, amount, txn_date, account_id, category_id, income_source, description, created_by)
    values (fam_id, 'income', 15000, d + 0, bank_id, cat_salary, 'Salary', 'Monthly salary', member_user_id);
  end loop;

  -- Sample expenses spread over the last 45 days
  insert into public.transactions (family_id, type, amount, txn_date, account_id, category_id, payment_method, description, created_by)
  select
    fam_id, 'expense',
    (array[45,60,120,35,80,220,15,90,300,50])[1 + (row_number() over () % 10)],
    current_date - (row_number() over ()) * 3,
    case when (row_number() over ()) % 3 = 0 then cash_id else bank_id end,
    (array[cat_groceries, cat_fuel, cat_entertainment, cat_shopping])[1 + (row_number() over () % 4)],
    (array['Cash','Debit Card','Credit Card'])[1 + (row_number() over () % 3)],
    (array['Groceries run','Fuel top-up','Movie night','New clothes','Dinner out'])[1 + (row_number() over () % 5)],
    member_user_id
  from generate_series(1, 15);

  insert into public.budgets (family_id, period_month, category_id, amount)
  values
    (fam_id, date_trunc('month', current_date), cat_groceries, 2000),
    (fam_id, date_trunc('month', current_date), cat_fuel, 1000),
    (fam_id, date_trunc('month', current_date), cat_entertainment, 500),
    (fam_id, date_trunc('month', current_date), null, 8000); -- overall budget

  insert into public.savings_goals (family_id, name, target_amount, current_amount, target_date, created_by)
  values
    (fam_id, 'Emergency Fund', 20000, 8500, current_date + interval '10 months', member_user_id),
    (fam_id, 'Vacation Fund', 6000, 2300, current_date + interval '6 months', member_user_id);

  insert into public.planned_expenses (family_id, name, expected_amount, expected_date, category_id, priority, account_id, created_by)
  values
    (fam_id, 'School fees', 4500, current_date + interval '20 days', null, 'high', bank_id, member_user_id),
    (fam_id, 'Car service', 800, current_date + interval '35 days', cat_fuel, 'medium', bank_id, member_user_id);

  raise notice 'Demo data seeded into family id: %', fam_id;
end $$;
