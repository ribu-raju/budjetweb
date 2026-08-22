"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { plannedExpenseSchema, type PlannedExpenseInput } from "@/lib/validations";
import { Dialog } from "@/components/ui/dialog";
import { Input, Label, Select, FieldError } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { PRIORITIES } from "@/lib/constants";
import { toISODate } from "@/lib/utils";
import type { Account, Category, PlannedExpense } from "@/types/database";

export function PlannedExpenseFormDialog({
  open,
  onClose,
  familyId,
  accounts,
  categories,
  planned,
}: {
  open: boolean;
  onClose: () => void;
  familyId: string;
  accounts: Account[];
  categories: Category[];
  planned?: PlannedExpense | null;
}) {
  const { show } = useToast();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const isEdit = !!planned;

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<PlannedExpenseInput>({
    resolver: zodResolver(plannedExpenseSchema),
    defaultValues: planned
      ? {
          name: planned.name,
          expected_amount: planned.expected_amount,
          expected_date: planned.expected_date,
          category_id: planned.category_id,
          priority: planned.priority,
          account_id: planned.account_id,
          status: planned.status,
        }
      : {
          name: "",
          expected_amount: undefined,
          expected_date: toISODate(new Date()),
          category_id: null,
          priority: "medium",
          account_id: accounts[0]?.id ?? null,
          status: "planned",
        },
  });

  async function onSubmit(values: PlannedExpenseInput) {
    setSubmitting(true);
    try {
      const supabase = createClient();
      const payload = { ...values, category_id: values.category_id || null, account_id: values.account_id || null };
      if (isEdit && planned) {
        const { error } = await supabase.from("planned_expenses").update(payload).eq("id", planned.id);
        if (error) throw error;
        show("success", "Planned expense updated.");
      } else {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const { error } = await supabase.from("planned_expenses").insert({ ...payload, family_id: familyId, created_by: user?.id });
        if (error) throw error;
        show("success", "Planned expense added.");
      }
      onClose();
      router.refresh();
    } catch {
      show("error", "Could not save this planned expense.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={isEdit ? "Edit planned expense" : "Plan a future expense"}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" {...register("name")} placeholder="e.g. School fees, Car service, Vacation" />
          <FieldError>{errors.name?.message}</FieldError>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="expected_amount">Expected amount</Label>
            <Input id="expected_amount" type="number" step="0.01" {...register("expected_amount")} />
            <FieldError>{errors.expected_amount?.message}</FieldError>
          </div>
          <div>
            <Label htmlFor="expected_date">Expected date</Label>
            <Input id="expected_date" type="date" {...register("expected_date")} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="priority">Priority</Label>
            <Select id="priority" {...register("priority")}>
              {PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="category_id">Category (optional)</Label>
            <Controller
              control={control}
              name="category_id"
              render={({ field }) => (
                <Select value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || null)}>
                  <option value="">None</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              )}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="account_id">Account (optional)</Label>
          <Controller
            control={control}
            name="account_id"
            render={({ field }) => (
              <Select value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || null)}>
                <option value="">None</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            )}
          />
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
