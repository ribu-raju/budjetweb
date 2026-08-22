-- =====================================================================
-- public.seed_default_categories(family_id)
-- Populates the standard category/subcategory tree for a brand new
-- family. Called once, server-side, right after a family is created
-- (see /api/setup/bootstrap-admin). Safe to re-run: it skips any
-- category name that already exists for the family (unique constraint).
-- =====================================================================

create or replace function public.seed_default_categories(p_family_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  cat_id uuid;
  cat record;
  sub text;
begin
  -- Each element: (name, type, icon, color, subcategories[])
  for cat in
    select * from (values
      ('Housing', 'expense', 'home', '#f97316', array['Rent','Mortgage','Maintenance','Electricity','Water','Gas','Internet','Home supplies']),
      ('Food', 'expense', 'utensils', '#22c55e', array['Groceries','Restaurants','Takeaway','Coffee','Snacks']),
      ('Transportation', 'expense', 'car', '#3b82f6', array['Fuel','Taxi','Public transport','Car maintenance','Parking','Insurance']),
      ('Family', 'expense', 'users', '#a855f7', array['Children','School','Education','Clothing','Family activities']),
      ('Medical', 'expense', 'heart-pulse', '#ef4444', array['Doctor visits','Medication','Health insurance','Personal care']),
      ('Lifestyle', 'expense', 'sparkles', '#ec4899', array['Entertainment','Shopping','Travel','Hobbies','Subscriptions']),
      ('Financial', 'expense', 'landmark', '#0ea5e9', array['Loan payment','Credit card','Bank fees','Investments','Savings']),
      ('Other', 'expense', 'more-horizontal', '#64748b', array['Gifts','Charity','Miscellaneous'])
    ) as t(name, type, icon, color, subs)
  loop
    insert into public.categories (family_id, name, type, icon, color, is_default, sort_order)
    values (p_family_id, cat.name, cat.type, cat.icon, cat.color, true, 0)
    on conflict (family_id, name, type) do nothing
    returning id into cat_id;

    if cat_id is null then
      select id into cat_id from public.categories
        where family_id = p_family_id and name = cat.name and type = cat.type;
    end if;

    foreach sub in array cat.subs loop
      insert into public.subcategories (category_id, family_id, name)
      values (cat_id, p_family_id, sub)
      on conflict (category_id, name) do nothing;
    end loop;

    cat_id := null;
  end loop;

  -- Income categories (no subcategories needed; income_source column
  -- on transactions carries the finer detail: Salary, Freelance, etc.)
  insert into public.categories (family_id, name, type, icon, color, is_default, sort_order)
  values
    (p_family_id, 'Salary', 'income', 'briefcase', '#16a34a', true, 0),
    (p_family_id, 'Freelance', 'income', 'laptop', '#16a34a', true, 1),
    (p_family_id, 'Business', 'income', 'store', '#16a34a', true, 2),
    (p_family_id, 'Bonus', 'income', 'gift', '#16a34a', true, 3),
    (p_family_id, 'Rental Income', 'income', 'building', '#16a34a', true, 4),
    (p_family_id, 'Investment', 'income', 'trending-up', '#16a34a', true, 5),
    (p_family_id, 'Other Income', 'income', 'plus-circle', '#16a34a', true, 6)
  on conflict (family_id, name, type) do nothing;
end;
$$;

revoke all on function public.seed_default_categories(uuid) from public, authenticated, anon;
grant execute on function public.seed_default_categories(uuid) to service_role;
