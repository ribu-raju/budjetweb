"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { emailSchema } from "@/lib/validations";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label, FieldError } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MailCheck } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter a valid email");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    // Always show the same success state whether or not the email is
    // registered, so this form can't be used to enumerate accounts.
    await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: `${appUrl}/auth/callback?next=/reset-password`,
    });
    setSubmitting(false);
    setSent(true);
  }

  if (sent) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 pt-6 text-center">
          <MailCheck className="h-10 w-10 text-primary" />
          <p className="text-sm">
            If an account exists for <strong>{email}</strong>, a password reset link has been sent.
          </p>
          <Link href="/login" className="text-sm text-primary hover:underline">
            Back to sign in
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <p className="text-sm text-muted-foreground">
            Enter your account email and we&apos;ll send you a link to reset your password.
          </p>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <FieldError>{error ?? undefined}</FieldError>
          </div>
          <Button type="submit" className="w-full" loading={submitting}>
            Send reset link
          </Button>
          <Link href="/login" className="flex items-center justify-center gap-1 text-sm text-muted-foreground hover:underline">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
          </Link>
        </form>
      </CardContent>
    </Card>
  );
}
