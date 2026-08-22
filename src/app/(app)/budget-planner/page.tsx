import { requireFamilyContext } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { BudgetPlannerWizard } from "./planner-wizard";
import { toISODate } from "@/lib/utils";
import type { Account, Category } from "@/types/database";

export const metadata = { title: "Budget Planner" };

export default async function BudgetPlannerPage() {
  const ctx = await requireFamilyContext();
  const supabase = await createClient();

  const [{ data: accounts }, { data: categories }] = await Promise.all([
    supabase.from("accounts").select("*").eq("family_id", ctx.familyId).eq("is_active", true).order("name"),
    supabase.from("categories").select("*").eq("family_id", ctx.familyId).eq("type", "expense").eq("is_active", true).order("sort_order"),
  ]);

  return (
    <div>
      <PageHeader title="Budget Planner" description="Plan next month step by step — income, essentials, flexible spending, savings, and upcoming expenses." />
      <BudgetPlannerWizard
        familyId={ctx.familyId}
        currency={ctx.currency}
        accounts={(accounts as Account[]) ?? []}
        categories={(categories as Category[]) ?? []}
        defaultMonth={toISODate(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1))}
      />
    </div>
  );
}
