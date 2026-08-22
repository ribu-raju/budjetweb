"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { accountSchema, type AccountInput } from "@/lib/validations";
import { Dialog } from "@/components/ui/dialog";
import { Input, Label, Select, Textarea, FieldError } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { ACCOUNT_TYPES, CURRENCIES } from "@/lib/constants";
import type { Account } from "@/types/database";

export function AccountFormDialog({
  open,
  onClose,
  familyId,
  defaultCurrency,
  account,
}: {
  open: boolean;
  onClose: () => void;
  familyId: string;
  defaultCurrency: string;
  account?: Account | null;
}) {
  const { show } = useToast();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const isEdit = !!account;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AccountInput>({
    resolver: zodResolver(accountSchema),
    defaultValues: account
      ? {
          name: account.name,
          type: account.type,
          opening_balance: account.opening_balance,
          currency: account.currency,
          description: account.description ?? "",
          is_active: account.is_active,
        }
      : {
          name: "",
          type: "bank",
          opening_balance: 0,
          currency: defaultCurrency,
          description: "",
          is_active: true,
        },
  });

  async function onSubmit(values: AccountInput) {
    setSubmitting(true);
    try {
      const supabase = createClient();
      if (isEdit && account) {
        const { error } = await supabase.from("accounts").update(values).eq("id", account.id);
        if (error) throw error;
        show("success", "Account updated.");
      } else {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const { error } = await supabase.from("accounts").insert({ ...values, family_id: familyId, created_by: user?.id });
        if (error) throw error;
        show("success", "Account created.");
      }
      onClose();
      router.refresh();
    } catch {
      show("error", "Could not save this account. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={isEdit ? "Edit account" : "Add account"}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <Label htmlFor="name">Account name</Label>
          <Input id="name" {...register("name")} placeholder="e.g. Main Bank Account" />
          <FieldError>{errors.name?.message}</FieldError>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="type">Type</Label>
            <Select id="type" {...register("type")}>
              {ACCOUNT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="currency">Currency</Label>
            <Select id="currency" {...register("currency")}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div>
          <Label htmlFor="opening_balance">Opening balance</Label>
          <Input id="opening_balance" type="number" step="0.01" {...register("opening_balance")} />
          <FieldError>{errors.opening_balance?.message}</FieldError>
          <p className="mt-1 text-xs text-muted-foreground">
            The current balance is calculated automatically from this opening balance plus every
            income, expense, and transfer recorded against the account.
          </p>
        </div>
        <div>
          <Label htmlFor="description">Description (optional)</Label>
          <Textarea id="description" {...register("description")} rows={2} />
        </div>
        {isEdit && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register("is_active")} className="h-4 w-4 rounded border-border" />
            Active
          </label>
        )}
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
