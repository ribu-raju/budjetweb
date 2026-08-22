import { requireFamilyContext, requireAdmin } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import { CategoriesClient } from "./categories-client";
import type { Category, Subcategory } from "@/types/database";

export const metadata = { title: "Categories" };
export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const ctx = await requireFamilyContext();
  requireAdmin(ctx);
  const supabase = await createClient();

  const [{ data: categories }, { data: subcategories }] = await Promise.all([
    supabase.from("categories").select("*").eq("family_id", ctx.familyId).order("type").order("sort_order"),
    supabase.from("subcategories").select("*").eq("family_id", ctx.familyId).order("name"),
  ]);

  return (
    <div>
      <PageHeader title="Settings" />
      <SettingsTabs isAdmin />
      <CategoriesClient familyId={ctx.familyId} categories={(categories as Category[]) ?? []} subcategories={(subcategories as Subcategory[]) ?? []} />
    </div>
  );
}
