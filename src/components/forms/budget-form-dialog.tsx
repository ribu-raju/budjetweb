"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { budgetSchema, type BudgetInput } from "@/lib/validations";
import { Dialog } from "@/components/ui/dialog";
import { Input, Label, Select, FieldError } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { Category } from "@/types/database";

export function BudgetFormDialog({
  open,
  onClose,
  familyId,
  periodMonth,
  categories,
  existingCategoryIds,
  hasOverallBudget,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  familyId: string;
  periodMonth: string;
  categories: Category[];
  existingCategoryIds: string[];
  hasOverallBudget: boolean;
  editing?: { budgetId: string; categoryId: string | null; amount: number } | null;
}) {
  const { show } = useToast();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const isEdit = !!editing;

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<BudgetInput>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      period_month: periodMonth,
      category_id: editing?.categoryId ?? null,
      amount: editing?.amount ?? undefined,
    },
  });

  const availableCategories = categories.filter((c) => !existingCategoryIds.includes(c.id));

  async function onSubmit(values: BudgetInput) {
    setSubmitting(true);
    try {
      const supabase = createClient();
      if (isEdit && editing) {
        const { error } = await supabase.from("budgets").update({ amount: values.amount }).eq("id", editing.budgetId);
        if (error) throw error;
        show("success", "Budget updated.");
      } else {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const { error } = await supabase.from("budgets").insert({
          family_id: familyId,
          period_month: periodMonth,
          category_id: values.category_id || null,
          amount: values.amount,
          created_by: user?.id,
        });
        if (error) throw error;
        show("success", "Budget set.");
      }
      onClose();
      router.refresh();
    } catch {
      show("error", "Could not save this budget.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={isEdit ? "Edit budget" : "Set a budget"}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <Label htmlFor="category_id">Applies to</Label>
          <Controller
            control={control}
            name="category_id"
            render={({ field }) => (
              <Select
                id="category_id"
                value={field.value ?? ""}
                onChange={(e) => field.onChange(e.target.value || null)}
                disabled={isEdit}
              >
                {!hasOverallBudget && <option value="">Overall monthly spending</option>}
                {availableCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            )}
          />
        </div>
        <div>
          <Label htmlFor="amount">Monthly budget amount</Label>
          <Input id="amount" type="number" step="0.01" {...register("amount")} />
          <FieldError>{errors.amount?.message}</FieldError>
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
