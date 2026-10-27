import { z } from "zod";
export const paymentMethods = [
  "ICICI UPI",
  "SBI UPI",
  "Cash",
  "Net banking",
  "Debit card",
  "Other",
] as const;
const text = z.string().trim().min(1, "This field is required").max(200);
const number = (positive = true) =>
  z
    .string()
    .regex(
      /^\d{1,12}(\.\d{1,2})?$/,
      "Enter a valid amount with up to 2 decimal places",
    )
    .refine(
      (v) => !positive || Number(v) > 0,
      "Amount must be greater than zero",
    );
const decimal = z
  .string()
  .regex(/^\d{1,12}(\.\d{1,6})?$/, "Enter a valid number")
  .refine((v) => Number(v) > 0, "Must be positive");
const date = z
  .string()
  .refine((v) => {
    if (
      !/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?)?$/.test(
        v,
      )
    )
      return false;
    const day = v.slice(0, 10);
    const calendar = new Date(day + "T00:00:00Z");
    return (
      Number.isFinite(calendar.getTime()) &&
      calendar.toISOString().slice(0, 10) === day &&
      Number.isFinite(new Date(v).getTime())
    );
  }, "Enter a valid calendar date")
  .transform(
    (v) =>
      new Date(
        v.length === 10
          ? v + "T00:00:00+05:30"
          : /[Zz]|[+-]\d{2}:\d{2}$/.test(v)
            ? v
            : v + "+05:30",
      ),
  );
const optionalId = z
  .string()
  .optional()
  .transform((v) => v || null);
export const schemas = {
  account: z.object({
    name: text,
    type: z.enum(["Bank", "Cash", "Investment", "External"]),
    currency: z.literal("INR"),
    openingBalance: z
      .string()
      .regex(/^-?\d{1,12}(\.\d{1,2})?$/, "Enter a valid opening balance"),
    archived: z.boolean().default(false),
  }),
  category: z.object({
    name: text,
    type: z.enum(["Expense", "Income"]),
    budget: z
      .union([number(false), z.literal("")])
      .optional()
      .transform((v) => v || null),
    description: z.string().max(500).optional(),
    icon: z.string().max(80).optional(),
    archived: z.boolean().default(false),
  }),
  transaction: z.object({
    date,
    amount: number(),
    type: z.enum(["Expense", "Income", "Transfer", "Investment"]),
    accountId: text,
    destinationId: optionalId,
    categoryId: optionalId,
    description: text,
    paymentMethod: z.enum(paymentMethods),
    consumption: z.boolean().default(true),
    notes: z.string().max(2000).optional(),
  }),
  stock: z.object({
    ticker: text,
    companyName: text,
    shares: decimal,
    averagePrice: number(false),
    currentPrice: number(false),
    purchaseDate: date,
    accountId: optionalId,
    archived: z.boolean().default(false),
  }),
  deposit: z
    .object({
      bankName: text,
      principal: number(),
      annualRate: z
        .string()
        .regex(/^\d{1,2}(\.\d{1,4})?$/, "Rate must be between 0 and 99.9999"),
      startDate: date,
      maturityDate: date,
      frequency: z.enum(["Annual", "Quarterly", "Monthly"]),
      accountId: optionalId,
      status: z.enum(["Active", "Archived", "Redeemed"]),
      notes: z.string().max(2000).optional(),
    })
    .refine((v) => v.maturityDate > v.startDate, {
      message: "Maturity must be after the start date",
      path: ["maturityDate"],
    }),
  split: z.object({
    friendName: text,
    purpose: text,
    totalAmount: number(),
    recoverable: number(),
    accountId: text,
    date,
    notes: z.string().max(2000).optional(),
  }),
  settlement: z.object({
    splitId: text,
    amount: number(),
    date,
    notes: z.string().max(2000).optional(),
  }),
  bulk: z.object({
    friendId: text,
    date,
    notes: z.string().max(2000).optional(),
  }),
  preference: z.object({
    reportingPeriod: z.enum(["month", "year"]),
    defaultPayment: z.enum(paymentMethods),
  }),
};
export type Entity = keyof typeof schemas;
