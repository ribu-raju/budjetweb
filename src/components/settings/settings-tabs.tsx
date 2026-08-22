"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/settings/profile", label: "Profile" },
  { href: "/settings/family", label: "Family Members", adminOnly: true },
  { href: "/settings/categories", label: "Categories", adminOnly: true },
  { href: "/settings/app", label: "Application Settings", adminOnly: true },
];

export function SettingsTabs({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  return (
    <div className="mb-6 flex gap-2 overflow-x-auto border-b border-border">
      {TABS.filter((t) => !t.adminOnly || isAdmin).map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={cn(
            "shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium",
            pathname === t.href ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
