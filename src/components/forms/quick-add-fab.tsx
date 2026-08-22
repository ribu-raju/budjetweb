"use client";

import { useState } from "react";
import { MobileNav } from "@/components/nav/mobile-nav";
import { TransactionFormDialog } from "@/components/forms/transaction-form-dialog";
import type { Account, Category, Subcategory } from "@/types/database";

export function QuickAddFab({
  familyId,
  accounts,
  categories,
}: {
  familyId: string;
  accounts: Account[];
  categories: (Category & { subcategories: Subcategory[] })[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <MobileNav onQuickAdd={() => setOpen(true)} />
      <TransactionFormDialog
        open={open}
        onClose={() => setOpen(false)}
        type="expense"
        familyId={familyId}
        accounts={accounts}
        categories={categories}
      />
    </>
  );
}
