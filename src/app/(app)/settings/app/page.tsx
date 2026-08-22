import { requireFamilyContext, requireAdmin } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import { AppSettingsClient } from "./app-settings-client";

export const metadata = { title: "Application Settings" };
export const dynamic = "force-dynamic";

export default async function AppSettingsPage() {
  const ctx = await requireFamilyContext();
  requireAdmin(ctx);
  const supabase = await createClient();

  const { data: family } = await supabase.from("families").select("*").eq("id", ctx.familyId).single();

  return (
    <div>
      <PageHeader title="Settings" />
      <SettingsTabs isAdmin />
      <AppSettingsClient familyId={ctx.familyId} name={family?.name ?? ""} currency={family?.currency ?? "AED"} fiscalDay={family?.fiscal_month_start_day ?? 1} />
    </div>
  );
}
