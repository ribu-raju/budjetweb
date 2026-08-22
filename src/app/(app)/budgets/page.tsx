import { requireFamilyContext } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { getBudgetSnapshot } from "@/lib/queries/budget-progress";
import { PageHeader } from "@/components/ui/page-header";
import { BudgetsClient } from "./budgets-client";
import { toISODate } from "@/lib/utils";
import type { Category } from "@/types/database";

export const metadata = { title: "Monthly Budget" };
export const dynamic = "force-dynamic";

export default async function BudgetsPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const ctx = await requireFamilyContext();
  const supabase = await createClient();
  const resolvedSearchParams = await searchParams;

  const monthDate = resolvedSearchParams.month ? new Date(resolvedSearchParams.month) : new Date();
  const periodMonth = toISODate(new Date(monthDate.getFullYear(), monthDate.getMonth(), 1));

  const [snapshot, { data: categories }] = await Promise.all([
    getBudgetSnapshot(supabase, ctx.familyId, monthDate),
    supabase.from("categories").select("*").eq("family_id", ctx.familyId).eq("type", "expense").eq("is_active", true).order("sort_order"),
  ]);

  return (
    <div>
      <PageHeader title="Monthly Budget" description="Set spending limits and see how your family is tracking against them." />
      <BudgetsClient
        snapshot={snapshot}
        categories={(categories as Category[]) ?? []}
        familyId={ctx.familyId}
        currency={ctx.currency}
        isAdmin={ctx.role === "admin"}
        periodMonth={periodMonth}
        monthDate={monthDate.toISOString()}
      />
    </div>
  );
}
