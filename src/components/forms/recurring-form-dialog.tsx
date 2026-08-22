"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { recurringTransactionSchema, type RecurringTransactionInput } from "@/lib/validations";
import { Dialog } from "@/components/ui/dialog";
import { Input, Label, Select, FieldError } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { FREQUENCIES } from "@/lib/constants";
import { toISODate } from "@/lib/utils";
import type { Account, Category, RecurringTransaction, TransactionType } from "@/types/database";

export function RecurringFormDialog({
  open,
  onClose,
  familyId,
  accounts,
  categories,
  rule,
}: {
  open: boolean;
  onClose: () => void;
  familyId: string;
  accounts: Account[];
  categories: Category[];
  rule?: RecurringTransaction | null;
}) {
  const { show } = useToast();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const isEdit = !!rule;

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<RecurringTransactionInput>({
    resolver: zodResolver(recurringTransactionSchema),
    defaultValues: rule
      ? {
          type: rule.type,
          amount: rule.amount,
          account_id: rule.account_id,
          category_id: rule.category_id,
          description: rule.description,
          frequency: rule.frequency,
          start_date: rule.start_date,
          end_date: rule.end_date,
        }
      : {
          type: "expense",
          amount: undefined,
          account_id: accounts[0]?.id ?? "",
          category_id: null,
          description: "",
          frequency: "monthly",
          start_date: toISODate(new Date()),
          end_date: null,
        },
  });

  const type = watch("type") as TransactionType;
  const relevantCategories = categories.filter((c) => c.type === type);

  async function onSubmit(values: RecurringTransactionInput) {
    setSubmitting(true);
    try {
      const supabase = createClient();
      if (isEdit && rule) {
        const { error } = await supabase.from("recurring_transactions").update({ ...values, category_id: values.category_id || null }).eq("id", rule.id);
        if (error) throw error;
        show("success", "Recurring rule updated.");
      } else {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const { error } = await supabase.from("recurring_transactions").insert({
          ...values,
          category_id: values.category_id || null,
          family_id: familyId,
          next_run_date: values.start_date,
          created_by: user?.id,
        });
        if (error) throw error;
        show("success", "Recurring transaction set up.");
      }
      onClose();
      router.refresh();
    } catch {
      show("error", "Could not save this recurring rule.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={isEdit ? "Edit recurring transaction" : "New recurring transaction"}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <Label htmlFor="type">Type</Label>
          <Select id="type" {...register("type")} disabled={isEdit}>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="description">Description</Label>
          <Input id="description" {...register("description")} placeholder="e.g. Rent, Salary, Netflix subscription" />
          <FieldError>{errors.description?.message}</FieldError>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="amount">Amount</Label>
            <Input id="amount" type="number" step="0.01" {...register("amount")} />
            <FieldError>{errors.amount?.message}</FieldError>
          </div>
          <div>
            <Label htmlFor="frequency">Frequency</Label>
            <Select id="frequency" {...register("frequency")}>
              {FREQUENCIES.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="account_id">Account</Label>
            <Select id="account_id" {...register("account_id")}>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="category_id">Category</Label>
            <Controller
              control={control}
              name="category_id"
              render={({ field }) => (
                <Select value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || null)}>
                  <option value="">None</option>
                  {relevantCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              )}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="start_date">Start date</Label>
            <Input id="start_date" type="date" {...register("start_date")} disabled={isEdit} />
          </div>
          <div>
            <Label htmlFor="end_date">End date (optional)</Label>
            <Input id="end_date" type="date" {...register("end_date")} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          A matching income or expense entry is created automatically each time this is due — no need to add it by hand.
        </p>
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
