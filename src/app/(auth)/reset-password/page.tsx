"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { passwordSchema } from "@/lib/validations";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label, FieldError } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // The recovery session is established server-side by
    // /auth/callback before this page loads (it exchanges the emailed
    // code for cookies). Just confirm a session now exists.
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      setReady(!!data.session);
      if (!data.session) {
        setError("This password reset link is invalid or has expired. Please request a new one.");
      }
    });
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = passwordSchema.safeParse(password);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter a valid password");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (updateError) {
      setError("Could not update your password. Please request a new reset link.");
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/dashboard"), 1500);
  }

  if (done) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 pt-6 text-center text-sm">
          <CheckCircle2 className="h-8 w-8 text-success" />
          Password updated. Redirecting…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        {!ready && !error && <p className="text-sm text-muted-foreground">Verifying your link…</p>}
        {(ready || error) && (
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            {error && (
              <div className="flex items-start gap-2 rounded-lg bg-danger/10 p-3 text-sm text-danger">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <div>
              <Label htmlFor="password">New password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={!ready} />
            </div>
            <div>
              <Label htmlFor="confirm">Confirm password</Label>
              <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} disabled={!ready} />
            </div>
            <FieldError>{undefined}</FieldError>
            <Button type="submit" className="w-full" loading={submitting} disabled={!ready}>
              Update password
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
