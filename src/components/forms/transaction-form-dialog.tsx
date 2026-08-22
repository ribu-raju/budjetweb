"use client";

import { useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { transactionSchema, type TransactionInput } from "@/lib/validations";
import { Dialog } from "@/components/ui/dialog";
import { Input, Label, Select, Textarea, FieldError } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { INCOME_SOURCES, PAYMENT_METHODS } from "@/lib/constants";
import { useRouter } from "next/navigation";
import { toISODate } from "@/lib/utils";
import { Paperclip } from "lucide-react";
import type { Account, Category, Subcategory, Transaction, TransactionType } from "@/types/database";

interface Props {
  open: boolean;
  onClose: () => void;
  type: TransactionType;
  familyId: string;
  accounts: Account[];
  categories: (Category & { subcategories: Subcategory[] })[];
  transaction?: Transaction | null;
}

export function TransactionFormDialog({ open, onClose, type, familyId, accounts, categories, transaction }: Props) {
  const { show } = useToast();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const isEdit = !!transaction;

  const {
    register,
    handleSubmit,
    watch,
    control,
    reset,
    formState: { errors },
  } = useForm<TransactionInput>({
    resolver: zodResolver(transactionSchema),
    defaultValues: transaction
      ? {
          type: transaction.type,
          amount: transaction.amount,
          txn_date: transaction.txn_date,
          account_id: transaction.account_id,
          category_id: transaction.category_id,
          subcategory_id: transaction.subcategory_id,
          income_source: transaction.income_source,
          payment_method: transaction.payment_method,
          description: transaction.description,
          notes: transaction.notes,
        }
      : {
          type,
          amount: undefined,
          txn_date: toISODate(new Date()),
          account_id: accounts[0]?.id ?? "",
          category_id: null,
          subcategory_id: null,
          income_source: type === "income" ? INCOME_SOURCES[0] : null,
          payment_method: type === "expense" ? PAYMENT_METHODS[0] : null,
          description: "",
          notes: "",
        },
  });

  const selectedCategoryId = watch("category_id");
  const subcategories = useMemo(
    () => categories.find((c) => c.id === selectedCategoryId)?.subcategories ?? [],
    [categories, selectedCategoryId]
  );

  async function onSubmit(values: TransactionInput) {
    setSubmitting(true);
    try {
      const supabase = createClient();
      let receipt_path = transaction?.receipt_path ?? null;

      if (receiptFile) {
        const path = `${familyId}/${crypto.randomUUID()}-${receiptFile.name}`;
        const { error: uploadError } = await supabase.storage.from("receipts").upload(path, receiptFile, {
          cacheControl: "3600",
          upsert: false,
        });
        if (uploadError) {
          show("error", "Could not upload the receipt, but you can still save the transaction.");
        } else {
          receipt_path = path;
        }
      }

      const payload = {
        family_id: familyId,
        type,
        amount: values.amount,
        txn_date: values.txn_date,
        account_id: values.account_id,
        category_id: values.category_id || null,
        subcategory_id: values.subcategory_id || null,
        income_source: type === "income" ? values.income_source || null : null,
        payment_method: type === "expense" ? values.payment_method || null : null,
        description: values.description || null,
        notes: values.notes || null,
        receipt_path,
      };

      if (isEdit && transaction) {
        const { error } = await supabase.from("transactions").update(payload).eq("id", transaction.id);
        if (error) throw error;
        show("success", `${type === "income" ? "Income" : "Expense"} updated successfully.`);
      } else {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const { error } = await supabase.from("transactions").insert({ ...payload, created_by: user?.id });
        if (error) throw error;
        show("success", `${type === "income" ? "Income" : "Expense"} added successfully.`);
      }

      reset();
      onClose();
      router.refresh();
    } catch {
      show("error", "Something went wrong saving this transaction. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const expenseCategories = categories.filter((c) => c.type === "expense");
  const incomeCategories = categories.filter((c) => c.type === "income");
  const relevantCategories = type === "income" ? incomeCategories : expenseCategories;

  return (
    <Dialog open={open} onClose={onClose} title={isEdit ? `Edit ${type}` : `Add ${type === "income" ? "Income" : "Expense"}`}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <Label htmlFor="amount">Amount</Label>
          <Input id="amount" type="number" step="0.01" inputMode="decimal" autoFocus {...register("amount")} placeholder="0.00" />
          <FieldError>{errors.amount?.message}</FieldError>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="txn_date">Date</Label>
            <Input id="txn_date" type="date" {...register("txn_date")} />
            <FieldError>{errors.txn_date?.message}</FieldError>
          </div>
          <div>
            <Label htmlFor="account_id">Account</Label>
            <Select id="account_id" {...register("account_id")}>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
            <FieldError>{errors.account_id?.message}</FieldError>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="category_id">Category</Label>
            <Controller
              control={control}
              name="category_id"
              render={({ field }) => (
                <Select id="category_id" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || null)}>
                  <option value="">Select category</option>
                  {relevantCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              )}
            />
            <FieldError>{errors.category_id?.message}</FieldError>
          </div>

          {type === "expense" ? (
            <div>
              <Label htmlFor="subcategory_id">Subcategory</Label>
              <Controller
                control={control}
                name="subcategory_id"
                render={({ field }) => (
                  <Select
                    id="subcategory_id"
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value || null)}
                    disabled={subcategories.length === 0}
                  >
                    <option value="">{subcategories.length ? "Select" : "None"}</option>
                    {subcategories.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                )}
              />
            </div>
          ) : (
            <div>
              <Label htmlFor="income_source">Income source</Label>
              <Select id="income_source" {...register("income_source")}>
                {INCOME_SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </div>

        {type === "expense" && (
          <div>
            <Label htmlFor="payment_method">Payment method</Label>
            <Select id="payment_method" {...register("payment_method")}>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          </div>
        )}

        <div>
          <Label htmlFor="description">Description</Label>
          <Input id="description" {...register("description")} placeholder="e.g. Weekly groceries" maxLength={200} />
        </div>

        <div>
          <Label htmlFor="notes">Notes (optional)</Label>
          <Textarea id="notes" {...register("notes")} rows={2} maxLength={2000} />
        </div>

        {type === "expense" && (
          <div>
            <Label htmlFor="receipt">Receipt (optional)</Label>
            <label className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-3 text-sm text-muted-foreground hover:bg-muted">
              <Paperclip className="h-4 w-4" />
              {receiptFile ? receiptFile.name : "Attach a photo or PDF"}
              <input
                id="receipt"
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
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
