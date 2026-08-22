"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/dialog";
import { AccountFormDialog } from "@/components/forms/account-form-dialog";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";
import { Wallet, Landmark, PiggyBank, CreditCard, Plus, Pencil, Trash2, MoreHorizontal } from "lucide-react";
import type { Account, AccountBalance } from "@/types/database";

const typeIcon: Record<string, React.ElementType> = {
  cash: Wallet,
  bank: Landmark,
  savings: PiggyBank,
  credit_card: CreditCard,
  other: MoreHorizontal,
};

export function AccountsClient({
  accounts,
  familyId,
  currency,
  isAdmin,
}: {
  accounts: AccountBalance[];
  familyId: string;
  currency: string;
  isAdmin: boolean;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AccountBalance | null>(null);
  const [deleting, setDeleting] = useState<AccountBalance | null>(null);
  const [busy, setBusy] = useState(false);
  const { show } = useToast();
  const router = useRouter();

  const totalAvailable = accounts.filter((a) => a.is_active).reduce((s, a) => s + Number(a.current_balance), 0);

  function toAccount(b: AccountBalance): Account {
    return {
      id: b.account_id,
      family_id: b.family_id,
      name: b.name,
      type: b.type,
      opening_balance: b.opening_balance,
      currency: b.currency,
      description: b.description,
      is_active: b.is_active,
      created_by: null,
      created_at: "",
      updated_at: "",
    };
  }

  async function handleDelete() {
    if (!deleting) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("accounts").delete().eq("id", deleting.account_id);
    setBusy(false);
    setDeleting(null);
    if (error) {
      show(
        "error",
        error.code === "23503"
          ? "This account has transactions linked to it and can't be deleted. Deactivate it instead."
          : "Could not delete this account."
      );
      return;
    }
    show("success", "Account deleted.");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card className="bg-primary text-primary-foreground">
        <CardContent className="flex items-center justify-between py-6">
          <div>
            <p className="text-sm opacity-80">Total Available Balance</p>
            <p className="mt-1 text-3xl font-bold">{formatCurrency(totalAvailable, currency)}</p>
          </div>
          {isAdmin && (
            <Button
              variant="secondary"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> Add account
            </Button>
          )}
        </CardContent>
      </Card>

      {accounts.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No accounts yet"
          description={isAdmin ? "Add your first account — cash wallet or bank account — to start tracking balances." : "Ask an admin to set up your family's accounts."}
          action={
            isAdmin && (
              <Button onClick={() => setFormOpen(true)}>
                <Plus className="h-4 w-4" /> Add account
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((a) => {
            const Icon = typeIcon[a.type] ?? Wallet;
            return (
              <Card key={a.account_id} className={!a.is_active ? "opacity-60" : ""}>
                <CardContent className="pt-5">
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <p className="font-medium leading-tight">{a.name}</p>
                        <p className="text-xs capitalize text-muted-foreground">{a.type.replace("_", " ")}</p>
                      </div>
                    </div>
                    {!a.is_active && <Badge variant="outline">Inactive</Badge>}
                  </div>
                  <p className="text-2xl font-bold">{formatCurrency(a.current_balance, a.currency)}</p>
                  <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Opening balance</span>
                      <span>{formatCurrency(a.opening_balance, a.currency)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Income received</span>
                      <span className="text-success">+{formatCurrency(a.total_income, a.currency)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Expenses paid</span>
                      <span className="text-danger">-{formatCurrency(a.total_expense, a.currency)}</span>
                    </div>
                    {(a.total_transfer_in > 0 || a.total_transfer_out > 0) && (
                      <div className="flex justify-between">
                        <span>Net transfers</span>
                        <span>{formatCurrency(a.total_transfer_in - a.total_transfer_out, a.currency)}</span>
                      </div>
                    )}
                  </div>
                  {isAdmin && (
                    <div className="mt-4 flex gap-2 border-t border-border pt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditing(a);
                          setFormOpen(true);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setDeleting(a)}>
                        <Trash2 className="h-3.5 w-3.5 text-danger" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AccountFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        familyId={familyId}
        defaultCurrency={currency}
        account={editing ? toAccount(editing) : null}
      />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Delete account?"
        description={`This will permanently delete "${deleting?.name}". This can't be undone.`}
        loading={busy}
      />
    </div>
  );
}
