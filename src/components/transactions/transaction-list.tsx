"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/dialog";
import { TransactionFormDialog } from "@/components/forms/transaction-form-dialog";
import { useToast } from "@/components/ui/toast";
import { formatCurrency, formatDate, monthRangeISO } from "@/lib/utils";
import { Search, Plus, Pencil, Trash2, Inbox, ChevronLeft, ChevronRight, Paperclip } from "lucide-react";
import type { Account, Category, Subcategory, Transaction, TransactionType } from "@/types/database";

const PAGE_SIZE = 15;

type TransactionWithJoins = Transaction & {
  accounts: { name: string } | null;
  categories: { name: string; color: string; icon: string } | null;
};

export function TransactionList({
  type,
  familyId,
  userId,
  isAdmin,
  currency,
  accounts,
  categories,
}: {
  type: TransactionType;
  familyId: string;
  userId: string;
  isAdmin: boolean;
  currency: string;
  accounts: Account[];
  categories: (Category & { subcategories: Subcategory[] })[];
}) {
  const { start, end } = monthRangeISO();
  const [search, setSearch] = useState("");
  const [accountFilter, setAccountFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [dateFrom, setDateFrom] = useState(start);
  const [dateTo, setDateTo] = useState(end);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<TransactionWithJoins[]>([]);
  const [total, setTotal] = useState(0);
  const [periodTotal, setPeriodTotal] = useState(0);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const [busy, setBusy] = useState(false);
  const { show } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    let query = supabase
      .from("transactions")
      .select("*, accounts(name), categories(name, color, icon)", { count: "exact" })
      .eq("family_id", familyId)
      .eq("type", type)
      .gte("txn_date", dateFrom)
      .lte("txn_date", dateTo)
      .order("txn_date", { ascending: false })
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

    if (accountFilter) query = query.eq("account_id", accountFilter);
    if (categoryFilter) query = query.eq("category_id", categoryFilter);
    if (search.trim()) query = query.ilike("description", `%${search.trim()}%`);

    const { data, count } = await query;
    setRows((data as TransactionWithJoins[]) ?? []);
    setTotal(count ?? 0);
    setLoading(false);
  }, [familyId, type, dateFrom, dateTo, accountFilter, categoryFilter, search, page]);

  useEffect(() => {
    load();
  }, [load]);

  // Separate lightweight aggregate for the filtered period's total —
  // avoids re-summing on the client from paginated rows only.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      let query = supabase
        .from("transactions")
        .select("amount")
        .eq("family_id", familyId)
        .eq("type", type)
        .gte("txn_date", dateFrom)
        .lte("txn_date", dateTo);
      if (accountFilter) query = query.eq("account_id", accountFilter);
      if (categoryFilter) query = query.eq("category_id", categoryFilter);
      if (search.trim()) query = query.ilike("description", `%${search.trim()}%`);
      const { data } = await query;
      if (!cancelled) setPeriodTotal((data ?? []).reduce((s, r) => s + Number(r.amount), 0));
    })();
    return () => {
      cancelled = true;
    };
  }, [familyId, type, dateFrom, dateTo, accountFilter, categoryFilter, search]);

  useEffect(() => setPage(0), [dateFrom, dateTo, accountFilter, categoryFilter, search]);

  async function handleDelete() {
    if (!deleting) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("transactions").delete().eq("id", deleting.id);
    setBusy(false);
    setDeleting(null);
    if (error) {
      show("error", "Could not delete this transaction.");
      return;
    }
    show("success", "Deleted.");
    load();
  }

  async function viewReceipt(path: string) {
    const supabase = createClient();
    const { data, error } = await supabase.storage.from("receipts").createSignedUrl(path, 60);
    if (error || !data) {
      show("error", "Could not open this receipt.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  const relevantCategories = categories.filter((c) => c.type === type);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const canEdit = (t: Transaction) => isAdmin || t.created_by === userId;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Total for selected period</p>
            <p className={`text-2xl font-bold ${type === "income" ? "text-success" : "text-danger"}`}>
              {type === "income" ? "+" : "-"}
              {formatCurrency(periodTotal, currency)}
            </p>
          </div>
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Add {type === "income" ? "Income" : "Expense"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid grid-cols-1 gap-3 py-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="relative lg:col-span-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search description…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          <Select value={accountFilter} onChange={(e) => setAccountFilter(e.target.value)}>
            <option value="">All accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
          <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="">All categories</option>
            {relevantCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </CardContent>
      </Card>

      {!loading && rows.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={`No ${type} records found`}
          description="Try widening your filters, or add a new record."
          action={
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4" /> Add {type === "income" ? "Income" : "Expense"}
            </Button>
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Account</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={6} className="px-4 py-3">
                          <div className="h-4 w-full animate-pulse rounded bg-muted" />
                        </td>
                      </tr>
                    ))
                  : rows.map((t) => (
                      <tr key={t.id} className="hover:bg-muted/40">
                        <td className="whitespace-nowrap px-4 py-3">{formatDate(t.txn_date)}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium">{t.description || "—"}</p>
                          {t.income_source && <p className="text-xs text-muted-foreground">{t.income_source}</p>}
                          {t.payment_method && <p className="text-xs text-muted-foreground">{t.payment_method}</p>}
                        </td>
                        <td className="px-4 py-3">
                          {t.categories ? (
                            <Badge style={{ backgroundColor: `${t.categories.color}22`, color: t.categories.color }}>
                              {t.categories.name}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">Uncategorized</span>
                          )}
                        </td>
                        <td className="px-4 py-3">{t.accounts?.name ?? "—"}</td>
                        <td className={`whitespace-nowrap px-4 py-3 text-right font-semibold ${type === "income" ? "text-success" : "text-danger"}`}>
                          {type === "income" ? "+" : "-"}
                          {formatCurrency(t.amount, currency)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            {t.receipt_path && (
                              <button onClick={() => viewReceipt(t.receipt_path!)} className="rounded p-1.5 hover:bg-muted" aria-label="View receipt">
                                <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                              </button>
                            )}
                            {canEdit(t) && (
                              <>
                                <button
                                  onClick={() => {
                                    setEditing(t);
                                    setFormOpen(true);
                                  }}
                                  className="rounded p-1.5 hover:bg-muted"
                                  aria-label="Edit"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button onClick={() => setDeleting(t)} className="rounded p-1.5 hover:bg-muted" aria-label="Delete">
                                  <Trash2 className="h-3.5 w-3.5 text-danger" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm">
            <p className="text-muted-foreground">
              {total === 0 ? "0 results" : `${page * PAGE_SIZE + 1}–${Math.min(total, (page + 1) * PAGE_SIZE)} of ${total}`}
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

      <TransactionFormDialog
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          load();
        }}
        type={type}
        familyId={familyId}
        accounts={accounts}
        categories={categories}
        transaction={editing}
      />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Delete this record?"
        description="This will permanently remove this transaction and update account balances accordingly."
        loading={busy}
      />
    </div>
  );
}
