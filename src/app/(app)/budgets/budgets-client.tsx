"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ConfirmDialog } from "@/components/ui/dialog";
import { BudgetFormDialog } from "@/components/forms/budget-form-dialog";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatMonth, budgetStatus, budgetStatusColor, budgetStatusEmoji } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Plus, Pencil, Trash2, Target } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import type { BudgetSnapshot, CategoryBudgetRow } from "@/lib/queries/budget-progress";
import type { Category } from "@/types/database";

export function BudgetsClient({
  snapshot,
  categories,
  familyId,
  currency,
  isAdmin,
  periodMonth,
  monthDate,
}: {
  snapshot: BudgetSnapshot;
  categories: Category[];
  familyId: string;
  currency: string;
  isAdmin: boolean;
  periodMonth: string;
  monthDate: string;
}) {
  const router = useRouter();
  const { show } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<{ budgetId: string; categoryId: string | null; amount: number } | null>(null);
  const [deleting, setDeleting] = useState<CategoryBudgetRow | null>(null);
  const [busy, setBusy] = useState(false);

  function navigateMonth(delta: number) {
    const d = new Date(monthDate);
    d.setMonth(d.getMonth() + delta);
    router.push(`/budgets?month=${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`);
  }

  async function handleDelete() {
    if (!deleting?.budgetId) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("budgets").delete().eq("id", deleting.budgetId);
    setBusy(false);
    setDeleting(null);
    if (error) {
      show("error", "Could not delete this budget.");
      return;
    }
    show("success", "Budget removed.");
    router.refresh();
  }

  const existingCategoryIds = snapshot.categories.map((r) => r.category?.id).filter(Boolean) as string[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigateMonth(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <p className="w-40 text-center font-medium">{formatMonth(new Date(monthDate))}</p>
          <Button variant="outline" size="icon" onClick={() => navigateMonth(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        {isAdmin && (
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Set budget
          </Button>
        )}
      </div>

      {snapshot.overall && (
        <BudgetRow
          row={snapshot.overall}
          currency={currency}
          isAdmin={isAdmin}
          highlight
          onEdit={() => {
            setEditing({ budgetId: snapshot.overall!.budgetId!, categoryId: null, amount: snapshot.overall!.budgeted });
            setFormOpen(true);
          }}
          onDelete={() => setDeleting(snapshot.overall)}
        />
      )}

      {snapshot.categories.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No category budgets set"
          description={isAdmin ? "Set a monthly limit for categories like Food, Transportation, or Entertainment." : "Ask an admin to set up category budgets."}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {snapshot.categories.map((row) => (
            <BudgetRow
              key={row.budgetId}
              row={row}
              currency={currency}
              isAdmin={isAdmin}
              onEdit={() => {
                setEditing({ budgetId: row.budgetId!, categoryId: row.category?.id ?? null, amount: row.budgeted });
                setFormOpen(true);
              }}
              onDelete={() => setDeleting(row)}
            />
          ))}
        </div>
      )}

      <BudgetFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        familyId={familyId}
        periodMonth={periodMonth}
        categories={categories}
        existingCategoryIds={existingCategoryIds}
        hasOverallBudget={!!snapshot.overall}
        editing={editing}
      />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Remove this budget?"
        description="Actual spending will still be tracked, just without a limit shown here."
        loading={busy}
      />
    </div>
  );
}

function BudgetRow({
  row,
  currency,
  isAdmin,
  highlight,
  onEdit,
  onDelete,
}: {
  row: CategoryBudgetRow;
  currency: string;
  isAdmin: boolean;
  highlight?: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const status = budgetStatus(row.percentUsed);
  return (
    <Card className={highlight ? "border-primary/40" : ""}>
      <CardContent className="pt-5">
        <div className="mb-2 flex items-start justify-between">
          <div>
            <p className="font-medium">{row.category?.name ?? "Overall Spending"}</p>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(row.actual, currency)} of {formatCurrency(row.budgeted, currency)}
            </p>
          </div>
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${budgetStatusColor[status]}`}>
            {budgetStatusEmoji[status]} {row.percentUsed}%
          </span>
        </div>
        <Progress
          value={row.percentUsed}
          barClassName={status === "over" ? "bg-danger" : status === "close" ? "bg-orange-500" : status === "watch" ? "bg-warning" : "bg-success"}
        />
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className={row.remaining < 0 ? "text-danger" : "text-muted-foreground"}>
            {row.remaining < 0 ? `${formatCurrency(row.overBy, currency)} over budget` : `${formatCurrency(row.remaining, currency)} remaining`}
          </span>
          {isAdmin && (
            <div className="flex gap-1">
              <button onClick={onEdit} className="rounded p-1 hover:bg-muted">
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button onClick={onDelete} className="rounded p-1 hover:bg-muted">
                <Trash2 className="h-3.5 w-3.5 text-danger" />
              </button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
