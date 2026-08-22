"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { categorySchema, type CategoryInput } from "@/lib/validations";
import { Dialog } from "@/components/ui/dialog";
import { Input, Label, FieldError } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { Category, TransactionType } from "@/types/database";

const PRESET_COLORS = ["#6366f1", "#22c55e", "#ef4444", "#f97316", "#3b82f6", "#a855f7", "#ec4899", "#0ea5e9", "#64748b", "#16a34a"];

export function CategoryFormDialog({
  open,
  onClose,
  familyId,
  type,
  category,
}: {
  open: boolean;
  onClose: () => void;
  familyId: string;
  type: TransactionType;
  category?: Category | null;
}) {
  const { show } = useToast();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const isEdit = !!category;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: category
      ? { name: category.name, type: category.type, icon: category.icon, color: category.color, is_active: category.is_active }
      : { name: "", type, icon: "circle", color: PRESET_COLORS[0], is_active: true },
  });

  const color = watch("color");

  async function onSubmit(values: CategoryInput) {
    setSubmitting(true);
    try {
      const supabase = createClient();
      if (isEdit && category) {
        const { error } = await supabase.from("categories").update(values).eq("id", category.id);
        if (error) throw error;
        show("success", "Category updated.");
      } else {
        const { error } = await supabase.from("categories").insert({ ...values, family_id: familyId });
        if (error) throw error;
        show("success", "Category created.");
      }
      onClose();
      router.refresh();
    } catch {
      show("error", "Could not save this category. The name may already be in use.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={isEdit ? "Edit category" : `New ${type} category`}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" {...register("name")} placeholder="e.g. Groceries" />
          <FieldError>{errors.name?.message}</FieldError>
        </div>
        <div>
          <Label>Color</Label>
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setValue("color", c)}
                className="h-7 w-7 rounded-full ring-offset-2"
                style={{ backgroundColor: c, boxShadow: color === c ? `0 0 0 2px ${c}` : undefined }}
                aria-label={c}
              />
            ))}
          </div>
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
