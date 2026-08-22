"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/dialog";
import { SavingsGoalFormDialog } from "@/components/forms/savings-goal-form-dialog";
import { ContributionFormDialog } from "@/components/forms/contribution-form-dialog";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { savingsGoalProgress } from "@/lib/calculations";
import { PiggyBank, Plus, Pencil, Trash2, Wallet } from "lucide-react";
import type { Account, SavingsGoal } from "@/types/database";

export function SavingsClient({
  familyId,
  currency,
  userId,
  isAdmin,
  goals,
  accounts,
}: {
  familyId: string;
  currency: string;
  userId: string;
  isAdmin: boolean;
  goals: SavingsGoal[];
  accounts: Account[];
}) {
  const router = useRouter();
  const { show } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SavingsGoal | null>(null);
  const [contributing, setContributing] = useState<SavingsGoal | null>(null);
  const [deleting, setDeleting] = useState<SavingsGoal | null>(null);
  const [busy, setBusy] = useState(false);

  const totalSaved = goals.reduce((s, g) => s + Number(g.current_amount), 0);
  const totalTarget = goals.reduce((s, g) => s + Number(g.target_amount), 0);

  async function handleDelete() {
    if (!deleting) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("savings_goals").delete().eq("id", deleting.id);
    setBusy(false);
    setDeleting(null);
    if (error) {
      show("error", "Could not delete this goal.");
      return;
    }
    show("success", "Goal deleted.");
    router.refresh();
  }

  const canEdit = (g: SavingsGoal) => isAdmin || g.created_by === userId;

  return (
    <div className="space-y-6">
      <Card className="bg-primary text-primary-foreground">
        <CardContent className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm opacity-80">Total saved across all goals</p>
            <p className="mt-1 text-3xl font-bold">
              {formatCurrency(totalSaved, currency)} <span className="text-lg font-normal opacity-70">/ {formatCurrency(totalTarget, currency)}</span>
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> New goal
          </Button>
        </CardContent>
      </Card>

      {goals.length === 0 ? (
        <EmptyState icon={PiggyBank} title="No savings goals yet" description="Create a goal like an Emergency Fund or Vacation Fund and start tracking progress." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {goals.map((g) => {
            const progress = savingsGoalProgress(g.current_amount, g.target_amount);
            return (
              <Card key={g.id}>
                <CardContent className="pt-5">
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/10 text-success">
                      <PiggyBank className="h-4.5 w-4.5" />
                    </div>
                    {canEdit(g) && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            setEditing(g);
                            setFormOpen(true);
                          }}
                          className="rounded p-1 hover:bg-muted"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setDeleting(g)} className="rounded p-1 hover:bg-muted">
                          <Trash2 className="h-3.5 w-3.5 text-danger" />
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="font-medium">{g.name}</p>
                  <p className="mt-1 text-xl font-bold">
                    {formatCurrency(g.current_amount, currency)}
                    <span className="text-sm font-normal text-muted-foreground"> / {formatCurrency(g.target_amount, currency)}</span>
                  </p>
                  <Progress value={progress} className="mt-3" />
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{progress}% complete</span>
                    {g.target_date && <span>Target: {formatDate(g.target_date)}</span>}
                  </div>
                  <Button variant="outline" size="sm" className="mt-4 w-full" onClick={() => setContributing(g)}>
                    <Wallet className="h-3.5 w-3.5" /> Add / Withdraw
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <SavingsGoalFormDialog open={formOpen} onClose={() => setFormOpen(false)} familyId={familyId} accounts={accounts} goal={editing} />

      {contributing && (
        <ContributionFormDialog
          open={!!contributing}
          onClose={() => setContributing(null)}
          goalId={contributing.id}
          goalName={contributing.name}
          familyId={familyId}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Delete this goal?"
        description="This will permanently delete the goal and its contribution history."
        loading={busy}
      />
    </div>
  );
}
