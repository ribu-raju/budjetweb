"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { transferSchema, type TransferInput } from "@/lib/validations";
import { Dialog } from "@/components/ui/dialog";
import { Input, Label, Select, FieldError } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { toISODate } from "@/lib/utils";
import type { Account, Transfer } from "@/types/database";

export function TransferFormDialog({
  open,
  onClose,
  familyId,
  accounts,
  transfer,
}: {
  open: boolean;
  onClose: () => void;
  familyId: string;
  accounts: Account[];
  transfer?: Transfer | null;
}) {
  const { show } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const isEdit = !!transfer;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TransferInput>({
    resolver: zodResolver(transferSchema),
    defaultValues: transfer
      ? {
          from_account_id: transfer.from_account_id,
          to_account_id: transfer.to_account_id,
          amount: transfer.amount,
          transfer_date: transfer.transfer_date,
          note: transfer.note,
        }
      : {
          from_account_id: accounts[0]?.id ?? "",
          to_account_id: accounts[1]?.id ?? accounts[0]?.id ?? "",
          amount: undefined,
          transfer_date: toISODate(new Date()),
          note: "",
        },
  });

  async function onSubmit(values: TransferInput) {
    setSubmitting(true);
    try {
      const supabase = createClient();
      if (isEdit && transfer) {
        const { error } = await supabase.from("transfers").update(values).eq("id", transfer.id);
        if (error) throw error;
        show("success", "Transfer updated.");
      } else {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const { error } = await supabase.from("transfers").insert({ ...values, family_id: familyId, created_by: user?.id });
        if (error) throw error;
        show("success", "Transfer recorded. Both account balances have been updated.");
      }
      onClose();
    } catch {
      show("error", "Could not save this transfer.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={isEdit ? "Edit transfer" : "Transfer money"}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="from_account_id">From</Label>
            <Select id="from_account_id" {...register("from_account_id")}>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="to_account_id">To</Label>
            <Select id="to_account_id" {...register("to_account_id")}>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
            <FieldError>{errors.to_account_id?.message}</FieldError>
          </div>
        </div>
        <div>
          <Label htmlFor="amount">Amount</Label>
          <Input id="amount" type="number" step="0.01" {...register("amount")} />
          <FieldError>{errors.amount?.message}</FieldError>
        </div>
        <div>
          <Label htmlFor="transfer_date">Date</Label>
          <Input id="transfer_date" type="date" {...register("transfer_date")} />
        </div>
        <div>
          <Label htmlFor="note">Note (optional)</Label>
          <Input id="note" {...register("note")} placeholder="e.g. Moving savings to bank" />
        </div>
        <p className="text-xs text-muted-foreground">
          Transfers move money between your own accounts. They are never counted as income or expense.
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
