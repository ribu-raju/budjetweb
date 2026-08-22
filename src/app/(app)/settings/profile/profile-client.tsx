"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Input, Label, FieldError } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { passwordSchema } from "@/lib/validations";

export function ProfileClient({ displayName, email, role, familyName }: { displayName: string; email: string; role: string; familyName: string }) {
  const { show } = useToast();
  const router = useRouter();
  const [name, setName] = useState(displayName);
  const [savingName, setSavingName] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  async function saveName() {
    if (!name.trim()) return;
    setSavingName(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase.from("family_members").update({ display_name: name.trim() }).eq("user_id", user?.id);
    setSavingName(false);
    if (error) {
      show("error", "Could not update your name.");
      return;
    }
    show("success", "Name updated.");
    router.refresh();
  }

  async function savePassword() {
    setPasswordError(null);
    const parsed = passwordSchema.safeParse(newPassword);
    if (!parsed.success) {
      setPasswordError(parsed.error.issues[0]?.message ?? "Invalid password");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }
    setSavingPassword(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) {
      setPasswordError("Could not update your password. Please try again.");
      return;
    }
    setNewPassword("");
    setConfirmPassword("");
    show("success", "Password updated.");
  }

  return (
    <div className="max-w-xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Email</Label>
            <Input value={email} disabled />
          </div>
          <div>
            <Label htmlFor="displayName">Display name</Label>
            <Input id="displayName" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Role:</span>
            <Badge variant={role === "admin" ? "info" : "default"} className="capitalize">
              {role}
            </Badge>
            <span className="ml-4">Family:</span> {familyName}
          </div>
        </CardContent>
        <CardFooter className="justify-end">
          <Button onClick={saveName} loading={savingName}>
            Save changes
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {passwordError && <p className="text-sm text-danger">{passwordError}</p>}
          <div>
            <Label htmlFor="newPassword">New password</Label>
            <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="confirmPassword">Confirm new password</Label>
            <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>
          <FieldError>{undefined}</FieldError>
        </CardContent>
        <CardFooter className="justify-end">
          <Button onClick={savePassword} loading={savingPassword}>
            Update password
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
