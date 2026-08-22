"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Search, Inbox, ChevronLeft, ChevronRight, Download } from "lucide-react";
import Papa from "papaparse";
import type { Account, Category } from "@/types/database";

const PAGE_SIZE = 20;

type Row = {
  id: string;
  kind: "income" | "expense" | "transfer";
  date: string;
  category: string | null;
  description: string;
  account: string;
  amount: number;
  status: string;
};

export function AllTransactionsTable({
  familyId,
  currency,
  accounts,
  categories,
}: {
  familyId: string;
  currency: string;
  accounts: Account[];
  categories: Category[];
}) {
  const [typeFilter, setTypeFilter] = useState<"" | "income" | "expense" | "transfer">("");
  const [accountFilter, setAccountFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortDesc, setSortDesc] = useState(true);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const results: Row[] = [];

    if (typeFilter !== "transfer") {
      let q = supabase
        .from("transactions")
        .select("id, type, txn_date, description, income_source, payment_method, amount, category_id, account_id, accounts(name), categories(name)")
        .eq("family_id", familyId)
        .order("txn_date", { ascending: !sortDesc })
        .limit(500);
      if (typeFilter === "income" || typeFilter === "expense") q = q.eq("type", typeFilter);
      if (accountFilter) q = q.eq("account_id", accountFilter);
      if (categoryFilter) q = q.eq("category_id", categoryFilter);
      if (dateFrom) q = q.gte("txn_date", dateFrom);
      if (dateTo) q = q.lte("txn_date", dateTo);
      const { data } = await q;
      for (const t of data ?? []) {
        results.push({
          id: t.id,
          kind: t.type,
          date: t.txn_date,
          category: (t.categories as unknown as { name: string } | null)?.name ?? null,
          description: t.description || t.income_source || t.payment_method || (t.type === "income" ? "Income" : "Expense"),
          account: (t.accounts as unknown as { name: string } | null)?.name ?? "—",
          amount: Number(t.amount),
          status: "Completed",
        });
      }
    }

    if (typeFilter === "" || typeFilter === "transfer") {
      let q = supabase
        .from("transfers")
        .select("id, transfer_date, amount, note, from_account_id, to_account_id, from:from_account_id(name), to:to_account_id(name)")
        .eq("family_id", familyId)
        .order("transfer_date", { ascending: !sortDesc })
        .limit(500);
      if (accountFilter) q = q.or(`from_account_id.eq.${accountFilter},to_account_id.eq.${accountFilter}`);
      if (dateFrom) q = q.gte("transfer_date", dateFrom);
      if (dateTo) q = q.lte("transfer_date", dateTo);
      const { data } = await q;
      for (const t of (data as unknown as { id: string; transfer_date: string; amount: number; note: string | null; from: { name: string } | null; to: { name: string } | null }[]) ?? []) {
        results.push({
          id: t.id,
          kind: "transfer",
          date: t.transfer_date,
          category: null,
          description: `${t.from?.name ?? "Account"} → ${t.to?.name ?? "Account"}${t.note ? ` (${t.note})` : ""}`,
          account: t.from?.name ?? "—",
          amount: Number(t.amount),
          status: "Completed",
        });
      }
    }

    let filtered = results;
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      filtered = filtered.filter((r) => r.description.toLowerCase().includes(s));
    }
    filtered.sort((a, b) => (sortDesc ? (a.date < b.date ? 1 : -1) : a.date > b.date ? 1 : -1));

    setRows(filtered);
    setLoading(false);
  }, [familyId, typeFilter, accountFilter, categoryFilter, search, dateFrom, dateTo, sortDesc]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => setPage(0), [typeFilter, accountFilter, categoryFilter, search, dateFrom, dateTo]);

  const paged = rows.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));

  function exportCsv() {
    const csv = Papa.unparse(
      rows.map((r) => ({
        Date: r.date,
        Type: r.kind,
        Category: r.category ?? "",
        Description: r.description,
        Account: r.account,
        Amount: r.amount,
        Currency: currency,
        Status: r.status,
      }))
    );
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transaction-history-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const kindStyle = { income: "text-success", expense: "text-danger", transfer: "text-info" };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="grid grid-cols-1 gap-3 py-4 sm:grid-cols-2 lg:grid-cols-6">
          <div className="relative lg:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search description…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as "" | "income" | "expense" | "transfer")}>
            <option value="">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
            <option value="transfer">Transfer</option>
          </Select>
          <Select value={accountFilter} onChange={(e) => setAccountFilter(e.target.value)}>
            <option value="">All accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
          <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} disabled={typeFilter === "transfer"}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <div className="flex gap-2">
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{rows.length} transactions</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setSortDesc((s) => !s)}>
            Sort: {sortDesc ? "Newest first" : "Oldest first"}
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
        </div>
      </div>

      {!loading && rows.length === 0 ? (
        <EmptyState icon={Inbox} title="No transactions found" description="Try adjusting your filters." />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium">Account</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={6} className="px-4 py-3">
                          <div className="h-4 w-full animate-pulse rounded bg-muted" />
                        </td>
                      </tr>
                    ))
                  : paged.map((r) => (
                      <tr key={r.id} className="hover:bg-muted/40">
                        <td className="whitespace-nowrap px-4 py-3">{formatDate(r.date)}</td>
                        <td className="px-4 py-3">
                          <Badge variant={r.kind === "income" ? "success" : r.kind === "expense" ? "danger" : "info"} className="capitalize">
                            {r.kind}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">{r.category ?? "—"}</td>
                        <td className="px-4 py-3">{r.description}</td>
                        <td className="px-4 py-3">{r.account}</td>
                        <td className={`whitespace-nowrap px-4 py-3 text-right font-semibold ${kindStyle[r.kind]}`}>
                          {r.kind === "income" ? "+" : r.kind === "expense" ? "-" : ""}
                          {formatCurrency(r.amount, currency)}
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm">
            <p className="text-muted-foreground">
              {rows.length === 0 ? "0 results" : `${page * PAGE_SIZE + 1}–${Math.min(rows.length, (page + 1) * PAGE_SIZE)} of ${rows.length}`}
            </p>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
