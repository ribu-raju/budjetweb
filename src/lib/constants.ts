export const INCOME_SOURCES = [
  "Salary",
  "Freelance",
  "Business",
  "Bonus",
  "Rental Income",
  "Investment",
  "Other",
] as const;

export const PAYMENT_METHODS = [
  "Cash",
  "Debit Card",
  "Credit Card",
  "Bank Transfer",
  "Mobile Payment",
  "Other",
] as const;

export const ACCOUNT_TYPES: { value: string; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "bank", label: "Bank Account" },
  { value: "savings", label: "Savings Account" },
  { value: "credit_card", label: "Credit Card" },
  { value: "other", label: "Other" },
];

export const CURRENCIES = ["AED", "USD", "EUR", "GBP", "SAR", "INR", "PKR"] as const;

export const PRIORITIES: { value: "low" | "medium" | "high"; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

export const FREQUENCIES: { value: string; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
];
