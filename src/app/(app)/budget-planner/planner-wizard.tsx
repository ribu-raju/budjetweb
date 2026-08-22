"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatMonth } from "@/lib/utils";
import { computePlannedRemaining } from "@/lib/calculations";
import { PRIORITIES } from "@/lib/constants";
import { AlertTriangle, CheckCircle2, Plus, Trash2, ArrowLeft, ArrowRight } from "lucide-react";
import type { Account, Category } from "@/types/database";

const ESSENTIAL_KEYS = [
  { key: "rent", label: "Rent / Mortgage" },
  { key: "utilities", label: "Utilities" },
  { key: "food", label: "Food" },
  { key: "transportation", label: "Transportation" },
  { key: "education", label: "Education" },
  { key: "insurance", label: "Insurance" },
  { key: "loan_payments", label: "Loan payments" },
  { key: "other", label: "Other essential expenses" },
];

const FLEXIBLE_KEYS = [
  { key: "shopping", label: "Shopping" },
  { key: "entertainment", label: "Entertainment" },
  { key: "dining", label: "Dining" },
  { key: "travel", label: "Travel" },
  { key: "hobbies", label: "Hobbies" },
  { key: "personal", label: "Personal spending" },
];

interface PlannedExpenseDraft {
  name: string;
  expected_amount: number;
  expected_date: string;
  category_id: string | null;
  priority: "low" | "medium" | "high";
  account_id: string | null;
}

const STEPS = ["Income", "Essentials", "Flexible", "Savings", "Planned Expenses", "Review"];

export function BudgetPlannerWizard({
  familyId,
  currency,
  accounts,
  categories,
  defaultMonth,
}: {
  familyId: string;
  currency: string;
  accounts: Account[];
  categories: Category[];
  defaultMonth: string;
}) {
  const { show } = useToast();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [planMonth, setPlanMonth] = useState(defaultMonth);
  const [expectedSalary, setExpectedSalary] = useState(0);
  const [expectedOther, setExpectedOther] = useState(0);
  const [essential, setEssential] = useState<Record<string, number>>({});
  const [flexible, setFlexible] = useState<Record<string, number>>({});
  const [savingsTarget, setSavingsTarget] = useState(0);
  const [emergencyTarget, setEmergencyTarget] = useState(0);
  const [investmentTarget, setInvestmentTarget] = useState(0);
  const [otherGoals, setOtherGoals] = useState<{ name: string; amount: number }[]>([]);
  const [plannedDrafts, setPlannedDrafts] = useState<PlannedExpenseDraft[]>([]);
  const [newPlanned, setNewPlanned] = useState<PlannedExpenseDraft>({
    name: "",
    expected_amount: 0,
    expected_date: defaultMonth,
    category_id: null,
    priority: "medium",
    account_id: accounts[0]?.id ?? null,
  });

  const expectedIncome = expectedSalary + expectedOther;
  const plannedExpensesTotal = plannedDrafts.reduce((s, p) => s + p.expected_amount, 0);
  const otherGoalsTotal = otherGoals.reduce((s, g) => s + g.amount, 0);

  const result = useMemo(
    () =>
      computePlannedRemaining({
        expectedIncome,
        essentialExpenses: essential,
        flexibleExpenses: flexible,
        plannedExpensesTotal,
        savingsTarget: savingsTarget + emergencyTarget + investmentTarget + otherGoalsTotal,
      }),
    [expectedIncome, essential, flexible, plannedExpensesTotal, savingsTarget, emergencyTarget, investmentTarget, otherGoalsTotal]
  );

  // Suggest the single largest flexible category as a place to trim,
  // sized to the deficit — a concrete, actionable nudge rather than a
  // generic "spend less" message.
  const suggestion = useMemo(() => {
    if (!result.isDeficit) return null;
    const entries = Object.entries(flexible).filter(([, v]) => v > 0);
    if (entries.length === 0) return "Consider reducing your savings target or a planned expense until income and spending balance.";
    const [topKey, topValue] = entries.sort((a, b) => b[1] - a[1])[0];
    const label = FLEXIBLE_KEYS.find((f) => f.key === topKey)?.label ?? topKey;
    const deficit = Math.abs(result.remaining);
    const suggestedCut = Math.min(topValue, deficit);
    return `Try trimming "${label}" by about ${formatCurrency(suggestedCut, currency)} — it's your largest flexible category.`;
  }, [result, flexible, currency]);

  function addPlannedDraft() {
    if (!newPlanned.name.trim() || newPlanned.expected_amount <= 0) {
      show("error", "Enter a name and an amount greater than zero.");
      return;
    }
    setPlannedDrafts((prev) => [...prev, newPlanned]);
    setNewPlanned({ name: "", expected_amount: 0, expected_date: defaultMonth, category_id: null, priority: "medium", account_id: accounts[0]?.id ?? null });
  }

  async function savePlan() {
    setSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error: planError } = await supabase.from("budget_plans").upsert(
        {
          family_id: familyId,
          name: `Plan for ${formatMonth(new Date(planMonth))}`,
          plan_month: planMonth,
          expected_salary: expectedSalary,
          expected_other_income: expectedOther,
          essential_expenses: essential,
          flexible_expenses: flexible,
          savings_target: savingsTarget,
          emergency_fund_target: emergencyTarget,
          investment_target: investmentTarget,
          other_savings_goals: otherGoals,
          created_by: user?.id,
        },
        { onConflict: "family_id,plan_month" }
      );
      if (planError) throw planError;

      if (plannedDrafts.length > 0) {
        const { error: peError } = await supabase.from("planned_expenses").insert(
          plannedDrafts.map((p) => ({
            family_id: familyId,
            name: p.name,
            expected_amount: p.expected_amount,
            expected_date: p.expected_date,
            category_id: p.category_id,
            priority: p.priority,
            account_id: p.account_id,
            created_by: user?.id,
          }))
        );
        if (peError) throw peError;
      }

      show("success", "Budget plan saved.");
      router.push("/planned-expenses");
      router.refresh();
    } catch {
      show("error", "Could not save your plan. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {STEPS.map((label, i) => (
          <button
            key={label}
            onClick={() => setStep(i)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              i === step ? "bg-primary text-primary-foreground" : i < step ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
            }`}
          >
            {i < step && <CheckCircle2 className="h-3.5 w-3.5" />}
            {i + 1}. {label}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="space-y-5 pt-6">
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="planMonth">Planning for month</Label>
                <Input id="planMonth" type="date" value={planMonth} onChange={(e) => setPlanMonth(e.target.value)} />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <NumberField label="Expected salary" value={expectedSalary} onChange={setExpectedSalary} />
                <NumberField label="Other expected income" value={expectedOther} onChange={setExpectedOther} />
              </div>
              <Total label="Total expected income" value={expectedIncome} currency={currency} />
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Plan your essential, non-negotiable expenses for the month.</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {ESSENTIAL_KEYS.map((f) => (
                  <NumberField key={f.key} label={f.label} value={essential[f.key] ?? 0} onChange={(v) => setEssential((prev) => ({ ...prev, [f.key]: v }))} />
                ))}
              </div>
              <Total label="Total essential expenses" value={Object.values(essential).reduce((a, b) => a + (b || 0), 0)} currency={currency} />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Plan your flexible, discretionary spending.</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {FLEXIBLE_KEYS.map((f) => (
                  <NumberField key={f.key} label={f.label} value={flexible[f.key] ?? 0} onChange={(v) => setFlexible((prev) => ({ ...prev, [f.key]: v }))} />
                ))}
              </div>
              <Total label="Total flexible spending" value={Object.values(flexible).reduce((a, b) => a + (b || 0), 0)} currency={currency} />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Set your savings goals for the month.</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <NumberField label="Monthly savings target" value={savingsTarget} onChange={setSavingsTarget} />
                <NumberField label="Emergency fund contribution" value={emergencyTarget} onChange={setEmergencyTarget} />
                <NumberField label="Investment contribution" value={investmentTarget} onChange={setInvestmentTarget} />
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">Other savings goals</p>
                <div className="space-y-2">
                  {otherGoals.map((g, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                      <span>
                        {g.name} — {formatCurrency(g.amount, currency)}
                      </span>
                      <button onClick={() => setOtherGoals((prev) => prev.filter((_, idx) => idx !== i))}>
                        <Trash2 className="h-3.5 w-3.5 text-danger" />
                      </button>
                    </div>
                  ))}
                </div>
                <AddOtherGoal onAdd={(g) => setOtherGoals((prev) => [...prev, g])} />
              </div>
              <Total label="Total savings target" value={savingsTarget + emergencyTarget + investmentTarget + otherGoalsTotal} currency={currency} />
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Plan for known future expenses — school fees, car service, vacation, and more.</p>
              <div className="space-y-2">
                {plannedDrafts.map((p, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                    <div>
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.expected_date} · <Badge variant="outline">{p.priority}</Badge>
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">{formatCurrency(p.expected_amount, currency)}</span>
                      <button onClick={() => setPlannedDrafts((prev) => prev.filter((_, idx) => idx !== i))}>
                        <Trash2 className="h-3.5 w-3.5 text-danger" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <Card className="bg-muted/30">
                <CardContent className="grid grid-cols-1 gap-3 pt-4 sm:grid-cols-2">
                  <div>
                    <Label>Name</Label>
                    <Input value={newPlanned.name} onChange={(e) => setNewPlanned((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. School fees" />
                  </div>
                  <div>
                    <Label>Expected amount</Label>
                    <Input type="number" step="0.01" value={newPlanned.expected_amount || ""} onChange={(e) => setNewPlanned((p) => ({ ...p, expected_amount: Number(e.target.value) }))} />
                  </div>
                  <div>
                    <Label>Expected date</Label>
                    <Input type="date" value={newPlanned.expected_date} onChange={(e) => setNewPlanned((p) => ({ ...p, expected_date: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <Select value={newPlanned.priority} onChange={(e) => setNewPlanned((p) => ({ ...p, priority: e.target.value as "low" | "medium" | "high" }))}>
                      {PRIORITIES.map((pr) => (
                        <option key={pr.value} value={pr.value}>
                          {pr.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label>Category (optional)</Label>
                    <Select value={newPlanned.category_id ?? ""} onChange={(e) => setNewPlanned((p) => ({ ...p, category_id: e.target.value || null }))}>
                      <option value="">None</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label>Account (optional)</Label>
                    <Select value={newPlanned.account_id ?? ""} onChange={(e) => setNewPlanned((p) => ({ ...p, account_id: e.target.value || null }))}>
                      <option value="">None</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="sm:col-span-2">
                    <Button type="button" variant="outline" onClick={addPlannedDraft}>
                      <Plus className="h-4 w-4" /> Add planned expense
                    </Button>
                  </div>
                </CardContent>
              </Card>
              <Total label="Total planned expenses" value={plannedExpensesTotal} currency={currency} />
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <div className="space-y-2 rounded-lg border border-border p-4 text-sm">
                <Row label="Expected income" value={result.expectedIncome} currency={currency} positive />
                <Row label="− Essential expenses" value={-result.essentialTotal} currency={currency} />
                <Row label="− Flexible expenses" value={-result.flexibleTotal} currency={currency} />
                <Row label="− Planned expenses" value={-result.plannedExpensesTotal} currency={currency} />
                <Row label="− Savings goals" value={-result.savingsTarget} currency={currency} />
                <div className="my-1 h-px bg-border" />
                <Row label="= Expected remaining balance" value={result.remaining} currency={currency} bold />
              </div>

              {result.isDeficit ? (
                <div className="flex items-start gap-2 rounded-lg bg-danger/10 p-4 text-sm text-danger">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                  <div>
                    <p className="font-medium">
                      ⚠️ Your planned spending is {formatCurrency(Math.abs(result.remaining), currency)} higher than your expected income.
                    </p>
                    {suggestion && <p className="mt-1 text-danger/90">{suggestion}</p>}
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2 rounded-lg bg-success/10 p-4 text-sm text-success">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                  <p>Your plan balances, with {formatCurrency(result.remaining, currency)} left over. Nice work.</p>
                </div>
              )}

              <Button className="w-full" onClick={savePlan} loading={saving}>
                Save Budget Plan
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        {step < STEPS.length - 1 && (
          <Button onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}>
            Next <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input type="number" step="0.01" min={0} value={value || ""} onChange={(e) => onChange(Number(e.target.value) || 0)} placeholder="0.00" />
    </div>
  );
}

function Total({ label, value, currency }: { label: string; value: number; currency: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-2.5 text-sm font-medium">
      <span>{label}</span>
      <span>{formatCurrency(value, currency)}</span>
    </div>
  );
}

function Row({ label, value, currency, bold, positive }: { label: string; value: number; currency: string; bold?: boolean; positive?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${bold ? "text-base font-bold" : ""}`}>
      <span className={bold ? "" : "text-muted-foreground"}>{label}</span>
      <span className={value < 0 && !positive ? "text-danger" : bold && value >= 0 ? "text-success" : ""}>{formatCurrency(value, currency)}</span>
    </div>
  );
}

function AddOtherGoal({ onAdd }: { onAdd: (g: { name: string; amount: number }) => void }) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState(0);
  return (
    <div className="mt-2 flex gap-2">
      <Input placeholder="Goal name" value={name} onChange={(e) => setName(e.target.value)} className="flex-1" />
      <Input type="number" placeholder="Amount" value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))} className="w-32" />
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          if (!name.trim() || amount <= 0) return;
          onAdd({ name, amount });
          setName("");
          setAmount(0);
        }}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
