import { requireFamilyContext } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { ReportsClient } from "./reports-client";
import type { Account, Category } from "@/types/database";

export const metadata = { title: "Reports" };

export default async function ReportsPage() {
  const ctx = await requireFamilyContext();
  const supabase = await createClient();

  const [{ data: accounts }, { data: categories }] = await Promise.all([
    supabase.from("accounts").select("*").eq("family_id", ctx.familyId).order("name"),
    supabase.from("categories").select("*").eq("family_id", ctx.familyId).eq("is_active", true).order("sort_order"),
  ]);

  return (
    <div>
      <PageHeader title="Reports" description="Generate and export reports on every part of your family's finances." />
      <ReportsClient
        familyId={ctx.familyId}
        currency={ctx.currency}
        accounts={(accounts as Account[]) ?? []}
        categories={(categories as Category[]) ?? []}
      />
    </div>
  );
}
