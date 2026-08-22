"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/dialog";
import { RecurringFormDialog } from "@/components/forms/recurring-form-dialog";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Repeat, Plus, Pencil, Trash2, Pause, Play } from "lucide-react";
import type { Account, Category, RecurringTransaction } from "@/types/database";

export function RecurringClient({
  familyId,
  currency,
  userId,
  isAdmin,
  rules,
  accounts,
  categories,
}: {
  familyId: string;
  currency: string;
  userId: string;
  isAdmin: boolean;
  rules: RecurringTransaction[];
  accounts: Account[];
  categories: Category[];
}) {
  const router = useRouter();
  const { show } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringTransaction | null>(null);
  const [deleting, setDeleting] = useState<RecurringTransaction | null>(null);
  const [busy, setBusy] = useState(false);

  const canEdit = (r: RecurringTransaction) => isAdmin || r.created_by === userId;

  async function toggleActive(rule: RecurringTransaction) {
    const supabase = createClient();
    const { error } = await supabase.from("recurring_transactions").update({ is_active: !rule.is_active }).eq("id", rule.id);
    if (error) {
      show("error", "Could not update this rule.");
      return;
    }
    show("success", rule.is_active ? "Paused." : "Resumed.");
    router.refresh();
  }

  async function handleDelete() {
    if (!deleting) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("recurring_transactions").delete().eq("id", deleting.id);
    setBusy(false);
    setDeleting(null);
    if (error) {
      show("error", "Could not delete this rule.");
      return;
    }
    show("success", "Recurring rule deleted.");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> New recurring transaction
        </Button>
      </div>

      {rules.length === 0 ? (
        <EmptyState icon={Repeat} title="No recurring transactions" description="Set up salary, rent, or subscriptions once and they'll post automatically." />
      ) : (
        <Card className="divide-y divide-border overflow-hidden">
          {rules.map((r) => (
            <div key={r.id} className={`flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between ${!r.is_active ? "opacity-60" : ""}`}>
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-full ${r.type === "income" ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>
                  <Repeat className="h-4.5 w-4.5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{r.description}</p>
                    <Badge variant="outline" className="capitalize">
                      {r.frequency}
                    </Badge>
                    {!r.is_active && <Badge variant="default">Paused</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">Next: {formatDate(r.next_run_date)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <p className={`font-semibold ${r.type === "income" ? "text-success" : "text-danger"}`}>{formatCurrency(r.amount, currency)}</p>
                {canEdit(r) && (
                  <div className="flex gap-1">
                    <button onClick={() => toggleActive(r)} className="rounded p-1.5 hover:bg-muted" title={r.is_active ? "Pause" : "Resume"}>
                      {r.is_active ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      onClick={() => {
                        setEditing(r);
                        setFormOpen(true);
                      }}
                      className="rounded p-1.5 hover:bg-muted"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => setDeleting(r)} className="rounded p-1.5 hover:bg-muted">
                      <Trash2 className="h-3.5 w-3.5 text-danger" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </Card>
      )}

      <RecurringFormDialog open={formOpen} onClose={() => setFormOpen(false)} familyId={familyId} accounts={accounts} categories={categories} rule={editing} />

      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={handleDelete} title="Delete this recurring rule?" description="Past transactions it already created will stay on record." loading={busy} />
    </div>
  );
}
