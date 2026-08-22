"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { savingsContributionSchema } from "@/lib/validations";
import { z } from "zod";
import { Dialog } from "@/components/ui/dialog";
import { Input, Label, FieldError } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toISODate } from "@/lib/utils";

type ContributionInput = z.infer<typeof savingsContributionSchema>;

export function ContributionFormDialog({
  open,
  onClose,
  goalId,
  goalName,
  familyId,
}: {
  open: boolean;
  onClose: () => void;
  goalId: string;
  goalName: string;
  familyId: string;
}) {
  const { show } = useToast();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<"deposit" | "withdraw">("deposit");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContributionInput>({
    resolver: zodResolver(savingsContributionSchema),
    defaultValues: { savings_goal_id: goalId, amount: undefined, contribution_date: toISODate(new Date()), note: "" },
  });

  async function onSubmit(values: ContributionInput) {
    setSubmitting(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const signedAmount = mode === "deposit" ? Math.abs(values.amount) : -Math.abs(values.amount);
      const { error } = await supabase.from("savings_contributions").insert({
        savings_goal_id: goalId,
        family_id: familyId,
        amount: signedAmount,
        contribution_date: values.contribution_date,
        note: values.note || null,
        created_by: user?.id,
      });
      if (error) throw error;
      show("success", mode === "deposit" ? "Contribution added." : "Withdrawal recorded.");
      reset();
      onClose();
      router.refresh();
    } catch {
      show("error", "Could not save this contribution.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={`Update "${goalName}"`}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode("deposit")}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${mode === "deposit" ? "border-success bg-success/10 text-success" : "border-border text-muted-foreground"}`}
          >
            Add money
          </button>
          <button
            type="button"
            onClick={() => setMode("withdraw")}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${mode === "withdraw" ? "border-danger bg-danger/10 text-danger" : "border-border text-muted-foreground"}`}
          >
            Withdraw
          </button>
        </div>
        <div>
          <Label htmlFor="amount">Amount</Label>
          <Input id="amount" type="number" step="0.01" {...register("amount")} />
          <FieldError>{errors.amount?.message}</FieldError>
        </div>
        <div>
          <Label htmlFor="contribution_date">Date</Label>
          <Input id="contribution_date" type="date" {...register("contribution_date")} />
        </div>
        <div>
          <Label htmlFor="note">Note (optional)</Label>
          <Input id="note" {...register("note")} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            Save
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
