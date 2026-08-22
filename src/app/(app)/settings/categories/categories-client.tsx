"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/dialog";
import { CategoryFormDialog } from "@/components/forms/category-form-dialog";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { Plus, Pencil, Trash2, Tag } from "lucide-react";
import type { Category, Subcategory, TransactionType } from "@/types/database";

export function CategoriesClient({ familyId, categories, subcategories }: { familyId: string; categories: Category[]; subcategories: Subcategory[] }) {
  const router = useRouter();
  const { show } = useToast();
  const [tab, setTab] = useState<TransactionType>("expense");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [busy, setBusy] = useState(false);
  const [newSubFor, setNewSubFor] = useState<string | null>(null);
  const [newSubName, setNewSubName] = useState("");

  const visible = useMemo(() => categories.filter((c) => c.type === tab), [categories, tab]);

  async function handleDelete() {
    if (!deleting) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("categories").delete().eq("id", deleting.id);
    setBusy(false);
    setDeleting(null);
    if (error) {
      show("error", "Could not delete this category.");
      return;
    }
    show("success", "Category deleted. Existing transactions keep their history but show as uncategorized.");
    router.refresh();
  }

  async function addSubcategory(categoryId: string) {
    if (!newSubName.trim()) return;
    const supabase = createClient();
    const { error } = await supabase.from("subcategories").insert({ category_id: categoryId, family_id: familyId, name: newSubName.trim() });
    if (error) {
      show("error", "Could not add subcategory.");
      return;
    }
    setNewSubName("");
    setNewSubFor(null);
    show("success", "Subcategory added.");
    router.refresh();
  }

  async function removeSubcategory(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("subcategories").delete().eq("id", id);
    if (error) {
      show("error", "Could not remove subcategory.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(["expense", "income"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize ${tab === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
            >
              {t}
            </button>
          ))}
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> New category
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {visible.map((cat) => (
          <Card key={cat.id} className={!cat.is_active ? "opacity-60" : ""}>
            <CardContent className="pt-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: cat.color }} />
                  <p className="font-medium">{cat.name}</p>
                  {!cat.is_active && <Badge variant="outline">Inactive</Badge>}
                  {cat.is_default && <Badge variant="default">Default</Badge>}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      setEditing(cat);
                      setFormOpen(true);
                    }}
                    className="rounded p-1 hover:bg-muted"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => setDeleting(cat)} className="rounded p-1 hover:bg-muted">
                    <Trash2 className="h-3.5 w-3.5 text-danger" />
                  </button>
                </div>
              </div>

              {tab === "expense" && (
                <div className="ml-5 space-y-1.5">
                  {subcategories
                    .filter((s) => s.category_id === cat.id)
                    .map((s) => (
                      <div key={s.id} className="flex items-center justify-between text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Tag className="h-3 w-3" /> {s.name}
                        </span>
                        <button onClick={() => removeSubcategory(s.id)}>
                          <Trash2 className="h-3 w-3 hover:text-danger" />
                        </button>
                      </div>
                    ))}
                  {newSubFor === cat.id ? (
                    <div className="flex gap-1.5 pt-1">
                      <Input value={newSubName} onChange={(e) => setNewSubName(e.target.value)} placeholder="Subcategory name" className="h-8 text-xs" autoFocus />
                      <Button size="sm" onClick={() => addSubcategory(cat.id)}>
                        Add
                      </Button>
                    </div>
                  ) : (
                    <button onClick={() => setNewSubFor(cat.id)} className="pt-1 text-xs text-primary hover:underline">
                      + Add subcategory
                    </button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <CategoryFormDialog open={formOpen} onClose={() => setFormOpen(false)} familyId={familyId} type={tab} category={editing} />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Delete this category?"
        description="Transactions already using it will keep their amounts but lose the category label. Consider deactivating instead if you want to keep it for records."
        loading={busy}
      />
    </div>
  );
}
