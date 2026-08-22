import { requireFamilyContext } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { AccountsClient } from "./accounts-client";
import type { AccountBalance } from "@/types/database";

export const metadata = { title: "Accounts" };

export default async function AccountsPage() {
  const ctx = await requireFamilyContext();
  const supabase = await createClient();

  const { data: balances } = await supabase
    .from("account_balances")
    .select("*")
    .eq("family_id", ctx.familyId)
    .order("name");

  return (
    <div>
      <PageHeader
        title="Accounts"
        description="Every place your family's money lives — cash, bank accounts, savings, and cards."
      />
      <AccountsClient
        accounts={(balances as AccountBalance[]) ?? []}
        familyId={ctx.familyId}
        currency={ctx.currency}
        isAdmin={ctx.role === "admin"}
      />
    </div>
  );
}
