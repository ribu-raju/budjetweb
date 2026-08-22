import { requireFamilyContext } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { getPeriodTotals } from "@/lib/queries/period-totals";
import { PageHeader } from "@/components/ui/page-header";
import { PeriodSummaryCards } from "@/components/transactions/period-summary-cards";
import { TransactionList } from "@/components/transactions/transaction-list";
import type { Account, Category, Subcategory } from "@/types/database";

export const metadata = { title: "Income" };

export default async function IncomePage() {
  const ctx = await requireFamilyContext();
  const supabase = await createClient();

  const [totals, { data: accounts }, { data: categories }, { data: subcategories }] = await Promise.all([
    getPeriodTotals(supabase, ctx.familyId, "income"),
    supabase.from("accounts").select("*").eq("family_id", ctx.familyId).eq("is_active", true).order("name"),
    supabase.from("categories").select("*").eq("family_id", ctx.familyId).eq("is_active", true).order("sort_order"),
    supabase.from("subcategories").select("*").eq("family_id", ctx.familyId).eq("is_active", true),
  ]);

  const categoriesWithSub: (Category & { subcategories: Subcategory[] })[] = (categories ?? []).map((c: Category) => ({
    ...c,
    subcategories: (subcategories ?? []).filter((s: Subcategory) => s.category_id === c.id),
  }));

  return (
    <div>
      <PageHeader title="Income" description="Every source of money coming into your family." />
      <PeriodSummaryCards totals={totals} currency={ctx.currency} type="income" />
      <TransactionList
        type="income"
        familyId={ctx.familyId}
        userId={ctx.userId}
        isAdmin={ctx.role === "admin"}
        currency={ctx.currency}
        accounts={(accounts as Account[]) ?? []}
        categories={categoriesWithSub}
      />
    </div>
  );
}
