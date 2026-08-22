import { requireFamilyContext } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/nav/sidebar";
import { UserMenu } from "@/components/nav/user-menu";
import { NotificationsBell } from "@/components/nav/notifications-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { QuickAddFab } from "@/components/forms/quick-add-fab";
import type { Account, Category, Subcategory } from "@/types/database";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireFamilyContext();
  const supabase = await createClient();

  const [{ data: accounts }, { data: categories }, { data: subcategories }] = await Promise.all([
    supabase.from("accounts").select("*").eq("family_id", ctx.familyId).eq("is_active", true).order("name"),
    supabase.from("categories").select("*").eq("family_id", ctx.familyId).eq("is_active", true).order("sort_order"),
    supabase.from("subcategories").select("*").eq("family_id", ctx.familyId).eq("is_active", true),
  ]);

  const categoriesWithSub: (Category & { subcategories: Subcategory[] })[] = (categories ?? []).map((c: Category) => ({
    ...c,
    subcategories: (subcategories ?? []).filter((s: Subcategory) => s.category_id === c.id),
  }));

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role={ctx.role} familyName={ctx.familyName} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur sm:px-6">
          <div className="lg:hidden">
            <p className="text-sm font-semibold">{ctx.familyName}</p>
          </div>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <NotificationsBell />
            <UserMenu displayName={ctx.displayName} email={ctx.email} role={ctx.role} />
          </div>
        </header>

        <main className="flex-1 px-4 pb-24 pt-4 sm:px-6 sm:pb-8 sm:pt-6 lg:pb-8">{children}</main>
      </div>

      <QuickAddFab familyId={ctx.familyId} accounts={(accounts as Account[]) ?? []} categories={categoriesWithSub} />
    </div>
  );
}
