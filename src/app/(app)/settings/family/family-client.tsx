"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { inviteMemberSchema } from "@/lib/validations";
import { z } from "zod";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input, Label, Select, FieldError } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils";
import { Copy, Trash2, UserMinus } from "lucide-react";

type InviteInput = z.infer<typeof inviteMemberSchema>;

interface MemberRow {
  id: string;
  user_id: string;
  role: "admin" | "member";
  display_name: string;
  status: string;
  created_at: string;
}
interface InviteRow {
  id: string;
  email: string;
  role: string;
  token: string;
  expires_at: string;
  created_at: string;
}

export function FamilyClient({ currentUserId, familyId, members, invites }: { currentUserId: string; familyId: string; members: MemberRow[]; invites: InviteRow[] }) {
  const router = useRouter();
  const { show } = useToast();
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [removing, setRemoving] = useState<MemberRow | null>(null);
  const [revoking, setRevoking] = useState<InviteRow | null>(null);
  const [busy, setBusy] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteInput>({ resolver: zodResolver(inviteMemberSchema), defaultValues: { role: "member" } });

  async function onInvite(values: InviteInput) {
    setCreatingInvite(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase.from("invites").insert({ family_id: familyId, email: values.email, role: values.role, invited_by: user?.id });
      if (error) throw error;
      show("success", "Invite created. Copy the link below and share it with them.");
      reset();
      router.refresh();
    } catch {
      show("error", "Could not create this invite. They may already have an account.");
    } finally {
      setCreatingInvite(false);
    }
  }

  function copyInviteLink(token: string) {
    const url = `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/register?token=${token}`;
    navigator.clipboard.writeText(url);
    show("success", "Invite link copied to clipboard.");
  }

  async function changeRole(member: MemberRow, role: "admin" | "member") {
    const supabase = createClient();
    const { error } = await supabase.from("family_members").update({ role }).eq("id", member.id);
    if (error) {
      show("error", "Could not update role.");
      return;
    }
    show("success", `${member.display_name} is now a${role === "admin" ? "n" : ""} ${role}.`);
    router.refresh();
  }

  async function handleRemove() {
    if (!removing) return;
    setBusy(true);
    try {
      const res = await fetch("/api/family/remove-member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberUserId: removing.user_id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      show("success", "Member removed.");
      router.refresh();
    } catch {
      show("error", "Could not remove this member.");
    } finally {
      setBusy(false);
      setRemoving(null);
    }
  }

  async function handleRevoke() {
    if (!revoking) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("invites").delete().eq("id", revoking.id);
    setBusy(false);
    setRevoking(null);
    if (error) {
      show("error", "Could not revoke this invite.");
      return;
    }
    show("success", "Invite revoked.");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Invite a family member</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onInvite)} className="flex flex-col gap-3 sm:flex-row sm:items-end" noValidate>
            <div className="flex-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} placeholder="family.member@email.com" />
              <FieldError>{errors.email?.message}</FieldError>
            </div>
            <div>
              <Label htmlFor="role">Role</Label>
              <Select id="role" {...register("role")}>
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </Select>
            </div>
            <Button type="submit" loading={creatingInvite}>
              Create invite
            </Button>
          </form>
          <p className="mt-3 text-xs text-muted-foreground">
            This app doesn&apos;t send emails automatically — create the invite, then copy the link below and share it directly (WhatsApp, SMS, etc.).
          </p>
        </CardContent>
      </Card>

      {invites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending invites</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {invites.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between gap-2 py-3 first:pt-0 last:pb-0">
                <div>
                  <p className="text-sm font-medium">{inv.email}</p>
                  <p className="text-xs capitalize text-muted-foreground">
                    {inv.role} · expires {formatDate(inv.expires_at)}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" onClick={() => copyInviteLink(inv.token)}>
                    <Copy className="h-3.5 w-3.5" /> Copy link
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => setRevoking(inv)}>
                    <Trash2 className="h-3.5 w-3.5 text-danger" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Family members</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between gap-2 py-3 first:pt-0 last:pb-0">
              <div>
                <p className="text-sm font-medium">
                  {m.display_name} {m.user_id === currentUserId && <span className="text-xs text-muted-foreground">(you)</span>}
                </p>
                <p className="text-xs text-muted-foreground">Member since {formatDate(m.created_at)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  className="h-8 w-28 text-xs"
                  value={m.role}
                  onChange={(e) => changeRole(m, e.target.value as "admin" | "member")}
                  disabled={m.user_id === currentUserId}
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </Select>
                {m.user_id !== currentUserId && (
                  <Button variant="outline" size="icon" onClick={() => setRemoving(m)}>
                    <UserMinus className="h-3.5 w-3.5 text-danger" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={handleRemove}
        title="Remove family member?"
        description={`${removing?.display_name} will lose access immediately. Their past transactions stay on record.`}
        loading={busy}
      />
      <ConfirmDialog open={!!revoking} onClose={() => setRevoking(null)} onConfirm={handleRevoke} title="Revoke this invite?" description="The link will stop working." loading={busy} />
    </div>
  );
}
