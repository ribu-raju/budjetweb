import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatCurrency(amount: number, currency = "AED", locale = "en-AE") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: "code",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(amount || 0)
    .replace(currency, currency + " ");
}

export function formatDate(date: string | Date, opts: Intl.DateTimeFormatOptions = {}) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...opts,
  }).format(d);
}

export function formatMonth(date: string | Date) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(d);
}

export function pct(numerator: number, denominator: number) {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function monthStart(d: Date = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function monthRangeISO(d: Date = new Date()) {
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return { start: toISODate(start), end: toISODate(end) };
}

export function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function budgetStatus(percentUsed: number): "good" | "watch" | "close" | "over" {
  if (percentUsed >= 100) return "over";
  if (percentUsed >= 90) return "close";
  if (percentUsed >= 70) return "watch";
  return "good";
}

export const budgetStatusColor: Record<string, string> = {
  good: "text-success bg-success/10",
  watch: "text-warning bg-warning/10",
  close: "text-orange-600 bg-orange-500/10",
  over: "text-danger bg-danger/10",
};

export const budgetStatusEmoji: Record<string, string> = {
  good: "🟢",
  watch: "🟡",
  close: "🟠",
  over: "🔴",
};
