import { requireFamilyContext } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { PlannedExpensesClient } from "./planned-expenses-client";
import type { Account, Category, PlannedExpense } from "@/types/database";

export const metadata = { title: "Planned Expenses" };
export const dynamic = "force-dynamic";

export default async function PlannedExpensesPage() {
  const ctx = await requireFamilyContext();
  const supabase = await createClient();

  const [{ data: planned }, { data: accounts }, { data: categories }] = await Promise.all([
    supabase.from("planned_expenses").select("*").eq("family_id", ctx.familyId).order("expected_date"),
    supabase.from("accounts").select("*").eq("family_id", ctx.familyId).eq("is_active", true).order("name"),
    supabase.from("categories").select("*").eq("family_id", ctx.familyId).eq("type", "expense").eq("is_active", true).order("sort_order"),
  ]);

  return (
    <div>
      <PageHeader title="Planned Expenses" description="Future spending you're anticipating — school fees, repairs, vacations, and more." />
      <PlannedExpensesClient
        familyId={ctx.familyId}
        currency={ctx.currency}
        userId={ctx.userId}
        isAdmin={ctx.role === "admin"}
        planned={(planned as PlannedExpense[]) ?? []}
        accounts={(accounts as Account[]) ?? []}
        categories={(categories as Category[]) ?? []}
      />
    </div>
  );
}
