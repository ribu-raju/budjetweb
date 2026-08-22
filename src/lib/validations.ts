import { z } from "zod";

// Shared, reused on both the client (react-hook-form) and the server
// (route handlers / server actions) so nothing is trusted from the
// browser alone — see project requirement #27.

export const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address");

export const passwordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .regex(/[a-z]/, "Include at least one lowercase letter")
  .regex(/[A-Z]/, "Include at least one uppercase letter")
  .regex(/[0-9]/, "Include at least one number");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const acceptInviteSchema = z.object({
  token: z.string().uuid(),
  displayName: z.string().trim().min(1, "Name is required").max(80),
  password: passwordSchema,
});

export const bootstrapAdminSchema = z.object({
  secret: z.string().min(1),
  familyName: z.string().trim().min(1).max(100),
  currency: z.string().trim().length(3).default("AED"),
  adminEmail: emailSchema,
  adminPassword: passwordSchema,
  adminName: z.string().trim().min(1).max(80),
});

export const inviteMemberSchema = z.object({
  email: emailSchema,
  role: z.enum(["admin", "member"]),
});

export const amountSchema = z.coerce
  .number({ invalid_type_error: "Enter a valid amount" })
  .positive("Amount must be greater than zero")
  .max(100_000_000, "Amount is too large");

export const dateSchema = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), "Enter a valid date");

export const transactionSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: amountSchema,
  txn_date: dateSchema,
  account_id: z.string().uuid("Select an account"),
  category_id: z.string().uuid("Select a category").nullable().optional(),
  subcategory_id: z.string().uuid().nullable().optional(),
  income_source: z.string().trim().max(60).nullable().optional(),
  payment_method: z.string().trim().max(60).nullable().optional(),
  description: z.string().trim().max(200).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  receipt_path: z.string().nullable().optional(),
}).superRefine((data, ctx) => {
  if (data.type === "expense" && !data.category_id) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Category is required for expenses", path: ["category_id"] });
  }
});

export const transferSchema = z
  .object({
    from_account_id: z.string().uuid("Select the source account"),
    to_account_id: z.string().uuid("Select the destination account"),
    amount: amountSchema,
    transfer_date: dateSchema,
    note: z.string().trim().max(200).nullable().optional(),
  })
  .refine((d) => d.from_account_id !== d.to_account_id, {
    message: "Source and destination accounts must be different",
    path: ["to_account_id"],
  });

export const accountSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  type: z.enum(["cash", "bank", "savings", "credit_card", "other"]),
  opening_balance: z.coerce.number().min(-100_000_000).max(100_000_000),
  currency: z.string().trim().length(3).default("AED"),
  description: z.string().trim().max(300).nullable().optional(),
  is_active: z.boolean().default(true),
});

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60),
  type: z.enum(["income", "expense"]),
  icon: z.string().trim().max(40).default("circle"),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Use a hex color like #6366f1")
    .default("#6366f1"),
  is_active: z.boolean().default(true),
});

export const budgetSchema = z.object({
  period_month: dateSchema,
  category_id: z.string().uuid().nullable(),
  amount: z.coerce.number().min(0).max(100_000_000),
});

export const savingsGoalSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  target_amount: amountSchema,
  current_amount: z.coerce.number().min(0).default(0),
  target_date: z.string().nullable().optional(),
  account_id: z.string().uuid().nullable().optional(),
});

export const savingsContributionSchema = z.object({
  savings_goal_id: z.string().uuid(),
  amount: z.coerce.number().refine((v) => v !== 0, "Amount cannot be zero"),
  contribution_date: dateSchema,
  note: z.string().trim().max(200).nullable().optional(),
});

export const plannedExpenseSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  expected_amount: amountSchema,
  expected_date: dateSchema,
  category_id: z.string().uuid().nullable().optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  account_id: z.string().uuid().nullable().optional(),
  status: z.enum(["planned", "completed", "cancelled"]).default("planned"),
});

export const recurringTransactionSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: amountSchema,
  account_id: z.string().uuid(),
  category_id: z.string().uuid().nullable().optional(),
  subcategory_id: z.string().uuid().nullable().optional(),
  description: z.string().trim().min(1).max(200),
  frequency: z.enum(["weekly", "monthly", "quarterly", "yearly"]),
  start_date: dateSchema,
  end_date: z.string().nullable().optional(),
});

export const budgetPlanSchema = z.object({
  name: z.string().trim().min(1).max(100).default("Monthly Plan"),
  plan_month: dateSchema,
  expected_salary: z.coerce.number().min(0).default(0),
  expected_other_income: z.coerce.number().min(0).default(0),
  essential_expenses: z.record(z.coerce.number().min(0)).default({}),
  flexible_expenses: z.record(z.coerce.number().min(0)).default({}),
  savings_target: z.coerce.number().min(0).default(0),
  emergency_fund_target: z.coerce.number().min(0).default(0),
  investment_target: z.coerce.number().min(0).default(0),
  other_savings_goals: z.array(z.object({ name: z.string(), amount: z.coerce.number().min(0) })).default([]),
  notes: z.string().trim().max(2000).nullable().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type TransactionInput = z.infer<typeof transactionSchema>;
export type TransferInput = z.infer<typeof transferSchema>;
export type AccountInput = z.infer<typeof accountSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type BudgetInput = z.infer<typeof budgetSchema>;
export type SavingsGoalInput = z.infer<typeof savingsGoalSchema>;
export type PlannedExpenseInput = z.infer<typeof plannedExpenseSchema>;
export type RecurringTransactionInput = z.infer<typeof recurringTransactionSchema>;
export type BudgetPlanInput = z.infer<typeof budgetPlanSchema>;
