"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { CURRENCIES } from "@/lib/constants";

export function AppSettingsClient({ familyId, name, currency, fiscalDay }: { familyId: string; name: string; currency: string; fiscalDay: number }) {
  const { show } = useToast();
  const router = useRouter();
  const [familyName, setFamilyName] = useState(name);
  const [curr, setCurr] = useState(currency);
  const [day, setDay] = useState(fiscalDay);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("families").update({ name: familyName, currency: curr, fiscal_month_start_day: day }).eq("id", familyId);
    setSaving(false);
    if (error) {
      show("error", "Could not save settings.");
      return;
    }
    show("success", "Settings saved.");
    router.refresh();
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Family &amp; currency</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="familyName">Family name</Label>
          <Input id="familyName" value={familyName} onChange={(e) => setFamilyName(e.target.value)} maxLength={100} />
        </div>
        <div>
          <Label htmlFor="currency">Default currency</Label>
          <Select id="currency" value={curr} onChange={(e) => setCurr(e.target.value)}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <p className="mt-1 text-xs text-muted-foreground">
            Changes how amounts are displayed across the app. Individual accounts can still use a different currency if needed.
          </p>
        </div>
        <div>
          <Label htmlFor="fiscalDay">Month starts on day</Label>
          <Input id="fiscalDay" type="number" min={1} max={28} value={day} onChange={(e) => setDay(Number(e.target.value))} className="w-24" />
          <p className="mt-1 text-xs text-muted-foreground">For families whose budgeting month doesn&apos;t start on the 1st (e.g. payday-aligned budgets).</p>
        </div>
      </CardContent>
      <CardFooter className="justify-end">
        <Button onClick={save} loading={saving}>
          Save settings
        </Button>
      </CardFooter>
    </Card>
  );
}
