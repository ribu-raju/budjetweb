"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import type { RangeKey } from "@/lib/queries/analytics";

const OPTIONS: { value: RangeKey; label: string }[] = [
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "last_3", label: "Last 3 months" },
  { value: "last_6", label: "Last 6 months" },
  { value: "this_year", label: "This year" },
  { value: "custom", label: "Custom" },
];

export function RangeSelector({ current, from, to }: { current: RangeKey; from?: string; to?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setRange(value: RangeKey) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", value);
    router.push(`/analytics?${params.toString()}`);
  }

  function setCustomDate(key: "from" | "to", value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", "custom");
    params.set(key, value);
    router.push(`/analytics?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          onClick={() => setRange(o.value)}
          className={`rounded-full px-3 py-1.5 text-xs font-medium ${current === o.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}
        >
          {o.label}
        </button>
      ))}
      {current === "custom" && (
        <div className="flex items-center gap-1.5">
          <Input type="date" className="h-8 w-36 text-xs" value={from ?? ""} onChange={(e) => setCustomDate("from", e.target.value)} />
          <span className="text-xs text-muted-foreground">to</span>
          <Input type="date" className="h-8 w-36 text-xs" value={to ?? ""} onChange={(e) => setCustomDate("to", e.target.value)} />
        </div>
      )}
    </div>
  );
}
