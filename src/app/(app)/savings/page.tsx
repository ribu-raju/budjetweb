import { requireFamilyContext } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { SavingsClient } from "./savings-client";
import type { Account, SavingsGoal } from "@/types/database";

export const metadata = { title: "Savings Goals" };
export const dynamic = "force-dynamic";

export default async function SavingsPage() {
  const ctx = await requireFamilyContext();
  const supabase = await createClient();

  const [{ data: goals }, { data: accounts }] = await Promise.all([
    supabase.from("savings_goals").select("*").eq("family_id", ctx.familyId).eq("is_active", true).order("created_at", { ascending: false }),
    supabase.from("accounts").select("*").eq("family_id", ctx.familyId).eq("is_active", true).order("name"),
  ]);

  return (
    <div>
      <PageHeader title="Savings Goals" description="Track progress toward everything your family is saving for." />
      <SavingsClient
        familyId={ctx.familyId}
        currency={ctx.currency}
        userId={ctx.userId}
        isAdmin={ctx.role === "admin"}
        goals={(goals as SavingsGoal[]) ?? []}
        accounts={(accounts as Account[]) ?? []}
      />
    </div>
  );
}
