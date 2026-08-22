import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ArrowDownCircle, ArrowUpCircle, ArrowLeftRight } from "lucide-react";

export interface RecentItem {
  id: string;
  kind: "income" | "expense" | "transfer";
  date: string;
  description: string;
  amount: number;
}

export function RecentTransactions({ items, currency }: { items: RecentItem[]; currency: string }) {
  const iconFor = { income: ArrowDownCircle, expense: ArrowUpCircle, transfer: ArrowLeftRight };
  const colorFor = { income: "text-success bg-success/10", expense: "text-danger bg-danger/10", transfer: "text-info bg-info/10" };
  const signFor = { income: "+", expense: "-", transfer: "" };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Recent Transactions</CardTitle>
        <Link href="/expenses" className="text-xs font-medium text-primary hover:underline">
          View all
        </Link>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No transactions yet. Add your first income or expense to get started.</p>
        ) : (
          <div className="divide-y divide-border">
            {items.map((item) => {
              const Icon = iconFor[item.kind];
              return (
                <div key={item.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${colorFor[item.kind]}`}>
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{item.description}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(item.date)}</p>
                    </div>
                  </div>
                  <p className={`shrink-0 text-sm font-semibold ${item.kind === "income" ? "text-success" : item.kind === "expense" ? "text-danger" : "text-info"}`}>
                    {signFor[item.kind]}
                    {formatCurrency(item.amount, currency)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
