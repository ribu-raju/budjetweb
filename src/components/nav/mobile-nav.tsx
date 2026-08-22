"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { mobilePrimaryNav } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { PlusCircle } from "lucide-react";

export function MobileNav({ onQuickAdd }: { onQuickAdd: () => void }) {
  const pathname = usePathname();
  const [first, second, ...rest] = mobilePrimaryNav;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t border-border bg-card/95 backdrop-blur lg:hidden">
      {[first, second].map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium",
              active ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Icon className="h-5 w-5" />
            {item.label}
          </Link>
        );
      })}

      <button
        onClick={onQuickAdd}
        className="mx-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
        aria-label="Add expense"
      >
        <PlusCircle className="h-7 w-7" />
      </button>

      {rest.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium",
              active ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Icon className="h-5 w-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
