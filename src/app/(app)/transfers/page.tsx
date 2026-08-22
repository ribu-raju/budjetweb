import { requireFamilyContext } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { TransfersClient } from "./transfers-client";
import type { Account } from "@/types/database";

export const metadata = { title: "Transfers" };

export default async function TransfersPage() {
  const ctx = await requireFamilyContext();
  const supabase = await createClient();
  const { data: accounts } = await supabase
    .from("accounts")
    .select("*")
    .eq("family_id", ctx.familyId)
    .eq("is_active", true)
    .order("name");

  return (
    <div>
      <PageHeader title="Transfers" description="Move money between your own accounts — never counted as income or expense." />
      <TransfersClient familyId={ctx.familyId} userId={ctx.userId} isAdmin={ctx.role === "admin"} currency={ctx.currency} accounts={(accounts as Account[]) ?? []} />
    </div>
  );
}
