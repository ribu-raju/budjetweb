"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, AlertTriangle, Info, AlertOctagon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Notification } from "@/types/database";

const severityIcon = {
  info: <Info className="h-4 w-4 text-info" />,
  warning: <AlertTriangle className="h-4 w-4 text-warning" />,
  danger: <AlertOctagon className="h-4 w-4 text-danger" />,
};

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setItems(data ?? []);
        setLoaded(true);
      });
  }, []);

  const unreadCount = items.filter((n) => !n.is_read).length;

  async function markRead(id: string) {
    const supabase = createClient();
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="relative rounded-lg p-2 text-muted-foreground hover:bg-muted" aria-label="Notifications">
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-danger-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 max-h-96 w-80 overflow-y-auto rounded-xl border border-border bg-card shadow-lg">
          <div className="border-b border-border p-3 text-sm font-semibold">Notifications</div>
          {!loaded && <p className="p-4 text-sm text-muted-foreground">Loading…</p>}
          {loaded && items.length === 0 && <p className="p-4 text-sm text-muted-foreground">You&apos;re all caught up.</p>}
          <div className="divide-y divide-border">
            {items.map((n) => (
              <button
                key={n.id}
                onClick={() => markRead(n.id)}
                className={cn("flex w-full items-start gap-2 p-3 text-left text-sm hover:bg-muted", !n.is_read && "bg-primary/5")}
              >
                {severityIcon[n.severity]}
                <div className="min-w-0">
                  <p className="font-medium">{n.title}</p>
                  <p className="text-xs text-muted-foreground">{n.message}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
