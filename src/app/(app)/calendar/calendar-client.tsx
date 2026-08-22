"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface DayEntry {
  id: string;
  kind: "income" | "expense" | "transfer" | "planned" | "recurring";
  label: string;
  amount: number;
}

const dotColor: Record<DayEntry["kind"], string> = {
  income: "bg-success",
  expense: "bg-danger",
  transfer: "bg-info",
  planned: "bg-warning",
  recurring: "bg-purple-500",
};

const kindLabel: Record<DayEntry["kind"], string> = {
  income: "Income",
  expense: "Expense",
  transfer: "Transfer",
  planned: "Planned",
  recurring: "Recurring",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function CalendarClient({ currency, monthDate, transactions, transfers, planned, recurring }: { currency: string; monthDate: string; transactions: any[]; transfers: any[]; planned: any[]; recurring: any[] }) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const month = new Date(monthDate);

  const entriesByDate = useMemo(() => {
    const map = new Map<string, DayEntry[]>();
    function add(date: string, entry: DayEntry) {
      if (!map.has(date)) map.set(date, []);
      map.get(date)!.push(entry);
    }
    for (const t of transactions) {
      add(t.txn_date, { id: t.id, kind: t.type, label: t.description || t.categories?.name || (t.type === "income" ? "Income" : "Expense"), amount: Number(t.amount) });
    }
    for (const t of transfers) {
      add(t.transfer_date, { id: t.id, kind: "transfer", label: `${t.from?.name ?? "Account"} → ${t.to?.name ?? "Account"}`, amount: Number(t.amount) });
    }
    for (const p of planned) {
      if (p.status === "planned") add(p.expected_date, { id: p.id, kind: "planned", label: p.name, amount: Number(p.expected_amount) });
    }
    for (const r of recurring) {
      add(r.next_run_date, { id: r.id, kind: "recurring", label: r.description, amount: Number(r.amount) });
    }
    return map;
  }, [transactions, transfers, planned, recurring]);

  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const startWeekday = firstDay.getDay();

  const cells: (string | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }

  function navigateMonth(delta: number) {
    const d = new Date(year, monthIndex + delta, 1);
    router.push(`/calendar?month=${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`);
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const selectedEntries = selectedDate ? entriesByDate.get(selectedDate) ?? [] : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={() => navigateMonth(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <p className="font-medium">{month.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</p>
        <Button variant="outline" size="icon" onClick={() => navigateMonth(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {(Object.keys(dotColor) as DayEntry["kind"][]).map((k) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${dotColor[k]}`} /> {kindLabel[k]}
          </span>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="grid grid-cols-7 border-b border-border text-center text-xs font-medium text-muted-foreground">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="py-2">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((date, i) => {
            if (!date) return <div key={i} className="min-h-20 border-b border-r border-border bg-muted/20 sm:min-h-24" />;
            const entries = entriesByDate.get(date) ?? [];
            const dayNum = Number(date.slice(-2));
            const isToday = date === todayStr;
            return (
              <button
                key={date}
                onClick={() => entries.length > 0 && setSelectedDate(date)}
                className={`min-h-20 border-b border-r border-border p-1.5 text-left align-top transition-colors sm:min-h-24 ${entries.length ? "hover:bg-muted/40" : ""}`}
              >
                <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${isToday ? "bg-primary text-primary-foreground" : ""}`}>{dayNum}</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {entries.slice(0, 4).map((e) => (
                    <span key={e.id} className={`h-1.5 w-1.5 rounded-full ${dotColor[e.kind]}`} />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      <Dialog open={!!selectedDate} onClose={() => setSelectedDate(null)} title={selectedDate ? formatDate(selectedDate) : ""}>
        <div className="space-y-2">
          {selectedEntries.map((e) => (
            <div key={e.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${dotColor[e.kind]}`} />
                <div>
                  <p className="font-medium">{e.label}</p>
                  <Badge variant="outline" className="mt-0.5">
                    {kindLabel[e.kind]}
                  </Badge>
                </div>
              </div>
              <span className="font-semibold">{formatCurrency(e.amount, currency)}</span>
            </div>
          ))}
        </div>
      </Dialog>
    </div>
  );
}
