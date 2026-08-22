import {
  LayoutDashboard,
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowLeftRight,
  Wallet,
  Repeat,
  Target,
  CalendarClock,
  PiggyBank,
  ListTree,
  PieChart,
  FileBarChart,
  Calendar,
  Settings,
  Users,
  Tags,
  SlidersHorizontal,
  UserCircle,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    label: "",
    items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Money",
    items: [
      { href: "/income", label: "Income", icon: ArrowDownCircle },
      { href: "/expenses", label: "Expenses", icon: ArrowUpCircle },
      { href: "/transfers", label: "Transfers", icon: ArrowLeftRight },
      { href: "/accounts", label: "Accounts", icon: Wallet },
      { href: "/recurring", label: "Recurring", icon: Repeat },
    ],
  },
  {
    label: "Planning",
    items: [
      { href: "/budgets", label: "Monthly Budget", icon: Target },
      { href: "/budget-planner", label: "Budget Planner", icon: ListTree },
      { href: "/planned-expenses", label: "Planned Expenses", icon: CalendarClock },
      { href: "/savings", label: "Savings Goals", icon: PiggyBank },
    ],
  },
  {
    label: "Analysis",
    items: [
      { href: "/analytics", label: "Spending Analysis", icon: PieChart },
      { href: "/reports", label: "Reports", icon: FileBarChart },
      { href: "/calendar", label: "Financial Calendar", icon: Calendar },
    ],
  },
  {
    label: "Settings",
    items: [
      { href: "/settings/profile", label: "Profile", icon: UserCircle },
      { href: "/settings/family", label: "Family Members", icon: Users, adminOnly: true },
      { href: "/settings/categories", label: "Categories", icon: Tags, adminOnly: true },
      { href: "/settings/app", label: "Application Settings", icon: SlidersHorizontal, adminOnly: true },
    ],
  },
];

export const mobilePrimaryNav: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/expenses", label: "Expenses", icon: ArrowUpCircle },
  { href: "/analytics", label: "Analysis", icon: PieChart },
  { href: "/settings/profile", label: "Settings", icon: Settings },
];
