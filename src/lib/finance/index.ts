import Decimal from "decimal.js";
import { ValidationError } from "../errors";
Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });
export type Money = Decimal.Value;
export const D = (v: Money = 0) => new Decimal(v);
export const sum = (values: Money[]) =>
  values.reduce<Decimal>((a, v) => a.plus(v), D(0));
export type Entry = {
  amount: Money;
  type: string;
  accountId: string;
  destinationId?: string | null;
  consumption: boolean;
  date: Date | string;
  categoryId?: string | null;
  paymentMethod?: string;
};
export function balance(
  account: { id: string; openingBalance: Money },
  entries: Entry[],
) {
  return entries.reduce((b, t) => {
    if (t.accountId === account.id)
      b = t.type === "Income" ? b.plus(t.amount) : b.minus(t.amount);
    if (t.type === "Transfer" && t.destinationId === account.id)
      b = b.plus(t.amount);
    return b;
  }, D(account.openingBalance));
}
export const isConsumption = (t: Entry) =>
  t.type === "Expense" && t.consumption;
export function stock(s: {
  shares: Money;
  averagePrice: Money;
  currentPrice: Money;
}) {
  const invested = D(s.shares).mul(s.averagePrice),
    value = D(s.shares).mul(s.currentPrice),
    profit = value.minus(invested);
  return {
    invested,
    value,
    profit,
    percent: invested.isZero() ? D(0) : profit.div(invested).mul(100),
  };
}
export function portfolio(stocks: Parameters<typeof stock>[0][]) {
  const rows = stocks.map(stock),
    invested = sum(rows.map((s) => s.invested)),
    value = sum(rows.map((s) => s.value)),
    profit = value.minus(invested);
  return {
    invested,
    value,
    profit,
    percent: invested.isZero() ? D(0) : profit.div(invested).mul(100),
  };
}
export function depositValue(
  f: {
    principal: Money;
    annualRate: Money;
    startDate: Date | string;
    maturityDate: Date | string;
    frequency: string;
  },
  at?: Date,
) {
  const start = new Date(f.startDate),
    end = new Date(f.maturityDate),
    date = at
      ? new Date(
          Math.min(end.getTime(), Math.max(start.getTime(), at.getTime())),
        )
      : end;
  const years = D(date.getTime() - start.getTime())
    .div(86400000)
    .div(365);
  const n = { Annual: 1, Quarterly: 4, Monthly: 12 }[f.frequency];
  if (!n) throw Error("Invalid compounding frequency");
  return D(f.principal)
    .mul(D(1).plus(D(f.annualRate).div(100).div(n)).pow(years.mul(n)))
    .toDecimalPlaces(2);
}
export function outstanding(
  recoverable: Money,
  settlements: { amount: Money }[],
) {
  return D(recoverable).minus(sum(settlements.map((s) => s.amount)));
}
export function validateSettlement(amount: Money, remaining: Money) {
  if (D(amount).lte(0) || D(amount).gt(remaining))
    throw new ValidationError(
      "Repayment must be positive and no greater than the outstanding balance.",
    );
}
export function netWorth(
  cash: Money,
  stocks: Money,
  deposits: Money,
  receivables: Money = 0,
  liabilities: Money = 0,
) {
  return D(cash)
    .plus(stocks)
    .plus(deposits)
    .plus(receivables)
    .minus(liabilities);
}
export function monthKey(date: Date | string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
  }).format(new Date(date));
}
export function monthly<T extends Entry>(entries: T[], month: string) {
  const rows = entries.filter((t) => monthKey(t.date) === month),
    consumption = rows.filter(isConsumption);
  return {
    rows,
    consumption,
    spending: sum(consumption.map((t) => t.amount)),
    income: sum(rows.filter((t) => t.type === "Income").map((t) => t.amount)),
    outflow: sum(rows.filter((t) => t.type !== "Income").map((t) => t.amount)),
    investments: sum(
      rows.filter((t) => t.type === "Investment").map((t) => t.amount),
    ),
    transfers: sum(
      rows.filter((t) => t.type === "Transfer").map((t) => t.amount),
    ),
  };
}
export function csvCell(value: unknown) {
  let s = String(value ?? "");
  if (/^[\s]*[=+\-@\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replaceAll('"', '""') + '"';
}
