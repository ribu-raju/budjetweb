import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { AccountBalance } from "@/types/database";

export function AccountsMiniList({ accounts, currency }: { accounts: AccountBalance[]; currency: string }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Accounts</CardTitle>
        <Link href="/accounts" className="text-xs font-medium text-primary hover:underline">
          Manage
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No accounts yet.{" "}
            <Link href="/accounts" className="text-primary hover:underline">
              Add one
            </Link>
            .
          </p>
        ) : (
          accounts.map((a) => (
            <div key={a.account_id} className="flex items-center justify-between text-sm">
              <span className="font-medium">{a.name}</span>
              <span className="font-semibold">{formatCurrency(a.current_balance, a.currency ?? currency)}</span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
