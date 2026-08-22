import { requireFamilyContext } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { RecurringClient } from "./recurring-client";
import type { Account, Category, RecurringTransaction } from "@/types/database";

export const metadata = { title: "Recurring Transactions" };
export const dynamic = "force-dynamic";

export default async function RecurringPage() {
  const ctx = await requireFamilyContext();
  const supabase = await createClient();

  const [{ data: rules }, { data: accounts }, { data: categories }] = await Promise.all([
    supabase.from("recurring_transactions").select("*").eq("family_id", ctx.familyId).order("next_run_date"),
    supabase.from("accounts").select("*").eq("family_id", ctx.familyId).eq("is_active", true).order("name"),
    supabase.from("categories").select("*").eq("family_id", ctx.familyId).eq("is_active", true).order("sort_order"),
  ]);

  return (
    <div>
      <PageHeader
        title="Recurring Transactions"
        description="Salary, rent, utilities, subscriptions, and other regular income or expenses — posted automatically when due."
      />
      <RecurringClient
        familyId={ctx.familyId}
        currency={ctx.currency}
        userId={ctx.userId}
        isAdmin={ctx.role === "admin"}
        rules={(rules as RecurringTransaction[]) ?? []}
        accounts={(accounts as Account[]) ?? []}
        categories={(categories as Category[]) ?? []}
      />
    </div>
  );
}
