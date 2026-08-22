"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/dialog";
import { TransferFormDialog } from "@/components/forms/transfer-form-dialog";
import { useToast } from "@/components/ui/toast";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ArrowLeftRight, Plus, Pencil, Trash2 } from "lucide-react";
import type { Account, Transfer } from "@/types/database";

type TransferWithJoins = Transfer & { from: { name: string } | null; to: { name: string } | null };

export function TransfersClient({
  familyId,
  userId,
  isAdmin,
  currency,
  accounts,
}: {
  familyId: string;
  userId: string;
  isAdmin: boolean;
  currency: string;
  accounts: Account[];
}) {
  const [rows, setRows] = useState<TransferWithJoins[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Transfer | null>(null);
  const [deleting, setDeleting] = useState<Transfer | null>(null);
  const [busy, setBusy] = useState(false);
  const { show } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("transfers")
      .select("*, from:from_account_id(name), to:to_account_id(name)")
      .eq("family_id", familyId)
      .order("transfer_date", { ascending: false })
      .limit(100);
    setRows((data as unknown as TransferWithJoins[]) ?? []);
    setLoading(false);
  }, [familyId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete() {
    if (!deleting) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("transfers").delete().eq("id", deleting.id);
    setBusy(false);
    setDeleting(null);
    if (error) {
      show("error", "Could not delete this transfer.");
      return;
    }
    show("success", "Transfer deleted.");
    load();
  }

  const canEdit = (t: Transfer) => isAdmin || t.created_by === userId;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          disabled={accounts.length < 2}
        >
          <Plus className="h-4 w-4" /> Transfer money
        </Button>
      </div>

      {accounts.length < 2 && (
        <p className="text-sm text-muted-foreground">You need at least two active accounts to make a transfer.</p>
      )}

      {!loading && rows.length === 0 ? (
        <EmptyState icon={ArrowLeftRight} title="No transfers yet" description="Move money between your cash, bank, and savings accounts here." />
      ) : (
        <Card className="divide-y divide-border overflow-hidden">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 animate-pulse bg-muted/40" />)
            : rows.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-info/10 text-info">
                      <ArrowLeftRight className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {t.from?.name ?? "—"} → {t.to?.name ?? "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(t.transfer_date)} {t.note ? `· ${t.note}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-semibold text-info">{formatCurrency(t.amount, currency)}</p>
                    {canEdit(t) && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            setEditing(t);
                            setFormOpen(true);
                          }}
                          className="rounded p-1.5 hover:bg-muted"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setDeleting(t)} className="rounded p-1.5 hover:bg-muted">
                          <Trash2 className="h-3.5 w-3.5 text-danger" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
        </Card>
      )}

      <TransferFormDialog
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          load();
        }}
        familyId={familyId}
        accounts={accounts}
        transfer={editing}
      />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Delete this transfer?"
        description="This will reverse the balance change on both accounts."
        loading={busy}
      />
    </div>
  );
}
