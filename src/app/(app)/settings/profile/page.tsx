import { requireFamilyContext } from "@/lib/session";
import { PageHeader } from "@/components/ui/page-header";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import { ProfileClient } from "./profile-client";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const ctx = await requireFamilyContext();

  return (
    <div>
      <PageHeader title="Settings" />
      <SettingsTabs isAdmin={ctx.role === "admin"} />
      <ProfileClient displayName={ctx.displayName} email={ctx.email} role={ctx.role} familyName={ctx.familyName} />
    </div>
  );
}
