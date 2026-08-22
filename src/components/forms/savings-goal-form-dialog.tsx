"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { savingsGoalSchema, type SavingsGoalInput } from "@/lib/validations";
import { Dialog } from "@/components/ui/dialog";
import { Input, Label, Select, FieldError } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { Account, SavingsGoal } from "@/types/database";

export function SavingsGoalFormDialog({
  open,
  onClose,
  familyId,
  accounts,
  goal,
}: {
  open: boolean;
  onClose: () => void;
  familyId: string;
  accounts: Account[];
  goal?: SavingsGoal | null;
}) {
  const { show } = useToast();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const isEdit = !!goal;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SavingsGoalInput>({
    resolver: zodResolver(savingsGoalSchema),
    defaultValues: goal
      ? {
          name: goal.name,
          target_amount: goal.target_amount,
          current_amount: goal.current_amount,
          target_date: goal.target_date,
          account_id: goal.account_id,
        }
      : { name: "", target_amount: undefined, current_amount: 0, target_date: null, account_id: null },
  });

  async function onSubmit(values: SavingsGoalInput) {
    setSubmitting(true);
    try {
      const supabase = createClient();
      if (isEdit && goal) {
        // current_amount is managed via contributions once a goal exists,
        // so edits here only touch name/target/date/account.
        const { error } = await supabase
          .from("savings_goals")
          .update({ name: values.name, target_amount: values.target_amount, target_date: values.target_date || null, account_id: values.account_id || null })
          .eq("id", goal.id);
        if (error) throw error;
        show("success", "Goal updated.");
      } else {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const { error } = await supabase.from("savings_goals").insert({
          family_id: familyId,
          name: values.name,
          target_amount: values.target_amount,
          current_amount: values.current_amount || 0,
          target_date: values.target_date || null,
          account_id: values.account_id || null,
          created_by: user?.id,
        });
        if (error) throw error;
        show("success", "Savings goal created.");
      }
      onClose();
      router.refresh();
    } catch {
      show("error", "Could not save this goal.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={isEdit ? "Edit savings goal" : "New savings goal"}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <Label htmlFor="name">Goal name</Label>
          <Input id="name" {...register("name")} placeholder="e.g. Emergency Fund" />
          <FieldError>{errors.name?.message}</FieldError>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="target_amount">Target amount</Label>
            <Input id="target_amount" type="number" step="0.01" {...register("target_amount")} />
            <FieldError>{errors.target_amount?.message}</FieldError>
          </div>
          {!isEdit && (
            <div>
              <Label htmlFor="current_amount">Starting amount</Label>
              <Input id="current_amount" type="number" step="0.01" {...register("current_amount")} />
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="target_date">Target date (optional)</Label>
            <Input id="target_date" type="date" {...register("target_date")} />
          </div>
          <div>
            <Label htmlFor="account_id">Linked account (optional)</Label>
            <Select id="account_id" {...register("account_id")}>
              <option value="">None</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </div>
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
