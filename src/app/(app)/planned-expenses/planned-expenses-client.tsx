"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/dialog";
import { PlannedExpenseFormDialog } from "@/components/forms/planned-expense-form-dialog";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate, toISODate } from "@/lib/utils";
import { CalendarClock, Plus, Pencil, Trash2, XCircle } from "lucide-react";
import type { Account, Category, PlannedExpense } from "@/types/database";

const priorityVariant: Record<string, "danger" | "warning" | "default"> = { high: "danger", medium: "warning", low: "default" };

export function PlannedExpensesClient({
  familyId,
  currency,
  userId,
  isAdmin,
  planned,
  accounts,
  categories,
}: {
  familyId: string;
  currency: string;
  userId: string;
  isAdmin: boolean;
  planned: PlannedExpense[];
  accounts: Account[];
  categories: Category[];
}) {
  const router = useRouter();
  const { show } = useToast();
  const [statusFilter, setStatusFilter] = useState<"planned" | "completed" | "cancelled" | "all">("planned");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PlannedExpense | null>(null);
  const [deleting, setDeleting] = useState<PlannedExpense | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => (statusFilter === "all" ? planned : planned.filter((p) => p.status === statusFilter)), [planned, statusFilter]);
  const plannedTotal = planned.filter((p) => p.status === "planned").reduce((s, p) => s + Number(p.expected_amount), 0);

  async function handleDelete() {
    if (!deleting) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("planned_expenses").delete().eq("id", deleting.id);
    setBusy(false);
    setDeleting(null);
    if (error) {
      show("error", "Could not delete this item.");
      return;
    }
    show("success", "Removed.");
    router.refresh();
  }

  async function markStatus(item: PlannedExpense, status: "completed" | "cancelled") {
    const supabase = createClient();
    const { error } = await supabase.from("planned_expenses").update({ status }).eq("id", item.id);
    if (error) {
      show("error", "Could not update status.");
      return;
    }
    show("success", status === "completed" ? "Marked as completed." : "Marked as cancelled.");
    router.refresh();
  }

  async function recordAsExpense(item: PlannedExpense) {
    if (!item.account_id) {
      show("error", "Set an account on this planned expense first.");
      return;
    }
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: tx, error: txError } = await supabase
      .from("transactions")
      .insert({
        family_id: familyId,
        type: "expense",
        amount: item.expected_amount,
        txn_date: toISODate(new Date()),
        account_id: item.account_id,
        category_id: item.category_id,
        description: item.name,
        created_by: user?.id,
      })
      .select()
      .single();
    if (txError || !tx) {
      show("error", "Could not record this as an expense.");
      return;
    }
    await supabase.from("planned_expenses").update({ status: "completed", actual_transaction_id: tx.id }).eq("id", item.id);
    show("success", "Recorded as an actual expense and marked complete.");
    router.refresh();
  }

  const canEdit = (p: PlannedExpense) => isAdmin || p.created_by === userId;

  return (
    <div className="space-y-6">
      <Card className="bg-primary text-primary-foreground">
        <CardContent className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm opacity-80">Total planned (not yet spent)</p>
            <p className="mt-1 text-3xl font-bold">{formatCurrency(plannedTotal, currency)}</p>
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Plan an expense
          </Button>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        {(["planned", "completed", "cancelled", "all"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize ${statusFilter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            {s}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={CalendarClock} title="Nothing here" description="Plan for upcoming expenses so they don't catch you off guard." />
      ) : (
        <Card className="divide-y divide-border overflow-hidden">
          {filtered.map((p) => (
            <div key={p.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{p.name}</p>
                  <Badge variant={priorityVariant[p.priority]}>{p.priority}</Badge>
                  {p.status !== "planned" && (
                    <Badge variant={p.status === "completed" ? "success" : "default"} className="capitalize">
                      {p.status}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Expected {formatDate(p.expected_date)}</p>
              </div>
              <div className="flex items-center gap-3">
                <p className="font-semibold">{formatCurrency(p.expected_amount, currency)}</p>
                {canEdit(p) && p.status === "planned" && (
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" onClick={() => recordAsExpense(p)}>
                      Record spent
                    </Button>
                    <button onClick={() => markStatus(p, "cancelled")} className="rounded p-1.5 hover:bg-muted" title="Cancel">
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => {
                        setEditing(p);
                        setFormOpen(true);
                      }}
                      className="rounded p-1.5 hover:bg-muted"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => setDeleting(p)} className="rounded p-1.5 hover:bg-muted">
                      <Trash2 className="h-3.5 w-3.5 text-danger" />
                    </button>
                  </div>
                )}
                {canEdit(p) && p.status !== "planned" && (
                  <button onClick={() => setDeleting(p)} className="rounded p-1.5 hover:bg-muted">
                    <Trash2 className="h-3.5 w-3.5 text-danger" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </Card>
      )}

      <PlannedExpenseFormDialog open={formOpen} onClose={() => setFormOpen(false)} familyId={familyId} accounts={accounts} categories={categories} planned={editing} />

      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={handleDelete} title="Delete this planned expense?" description="This can't be undone." loading={busy} />
    </div>
  );
}
