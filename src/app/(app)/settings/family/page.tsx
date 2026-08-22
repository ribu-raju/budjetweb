import { requireFamilyContext, requireAdmin } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import { FamilyClient } from "./family-client";

export const metadata = { title: "Family Members" };
export const dynamic = "force-dynamic";

interface MemberRow {
  id: string;
  user_id: string;
  role: "admin" | "member";
  display_name: string;
  status: string;
  created_at: string;
}

export default async function FamilyPage() {
  const ctx = await requireFamilyContext();
  requireAdmin(ctx);
  const supabase = await createClient();

  const [{ data: members }, { data: invites }] = await Promise.all([
    supabase.from("family_members").select("*").eq("family_id", ctx.familyId).order("created_at"),
    supabase.from("invites").select("*").eq("family_id", ctx.familyId).is("accepted_at", null).order("created_at", { ascending: false }),
  ]);

  return (
    <div>
      <PageHeader title="Settings" />
      <SettingsTabs isAdmin />
      <FamilyClient
        currentUserId={ctx.userId}
        familyId={ctx.familyId}
        members={(members as MemberRow[]) ?? []}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        invites={(invites as any[]) ?? []}
      />
    </div>
  );
}
