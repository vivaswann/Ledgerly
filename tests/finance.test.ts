import { test } from "node:test";
import assert from "node:assert/strict";
import {
  balance,
  sum,
  isConsumption,
  monthly,
  stock,
  portfolio,
  depositValue,
  outstanding,
  validateSettlement,
  netWorth,
  csvCell,
  monthKey,
  type Entry,
} from "../src/lib/finance/index";
import { money } from "../src/lib/formatters";
const entry = (
  type: string,
  amount: string,
  extra: Partial<Entry> = {},
): Entry => ({
  type,
  amount,
  accountId: "a",
  destinationId: null,
  date: new Date("2026-10-01T10:00:00+05:30"),
  consumption: type === "Expense",
  ...extra,
});
test("decimal arithmetic preserves exact paise", () =>
  assert.equal(sum(["0.10", "0.20"]).toString(), "0.3"));
test("opening balance, income, expense and investments affect balance once", () =>
  assert.equal(
    balance({ id: "a", openingBalance: "1000" }, [
      entry("Income", "200"),
      entry("Expense", "75.25"),
      entry("Investment", "100"),
    ]).toFixed(2),
    "1024.75",
  ));
test("one transfer debits source and credits destination without changing wealth", () => {
  const t = entry("Transfer", "300", { destinationId: "b" });
  assert.equal(
    balance({ id: "a", openingBalance: "500" }, [t]).toString(),
    "200",
  );
  assert.equal(
    balance({ id: "b", openingBalance: "100" }, [t]).toString(),
    "400",
  );
  assert.equal(
    sum([
      balance({ id: "a", openingBalance: 500 }, [t]),
      balance({ id: "b", openingBalance: 100 }, [t]),
    ]).toString(),
    "600",
  );
});
test("deleting expense restores the derived balance", () => {
  const e = entry("Expense", "40");
  assert.equal(balance({ id: "a", openingBalance: 100 }, [e]).toString(), "60");
  assert.equal(balance({ id: "a", openingBalance: 100 }, []).toString(), "100");
});
test("consumption excludes income, transfers, investments, and opted-out expenses", () => {
  assert.equal(
    [
      entry("Expense", "10"),
      entry("Expense", "20", { consumption: false }),
      entry("Income", "10"),
      entry("Transfer", "10"),
      entry("Investment", "10"),
    ].filter(isConsumption).length,
    1,
  );
});
test("net worth adds assets and receivables and subtracts liabilities", () =>
  assert.equal(netWorth("100", "200", "300", "50", "20").toString(), "630"));
test("stock return and safe zero invested capital", () => {
  const s = stock({ shares: "10", averagePrice: "100", currentPrice: "125" });
  assert.equal(s.profit.toString(), "250");
  assert.equal(s.percent.toString(), "25");
  assert.equal(
    stock({ shares: 1, averagePrice: 0, currentPrice: 10 }).percent.toString(),
    "0",
  );
});
test("portfolio return is weighted by aggregate invested capital", () => {
  const p = portfolio([
    { shares: 1, averagePrice: 100, currentPrice: 200 },
    { shares: 1, averagePrice: 900, currentPrice: 900 },
  ]);
  assert.equal(p.percent.toString(), "10");
});
test("annual FD uses nominal rate and actual days/365", () =>
  assert.equal(
    depositValue({
      principal: "10000",
      annualRate: "7",
      frequency: "Annual",
      startDate: "2025-01-01",
      maturityDate: "2026-01-01",
    }).toString(),
    "10700",
  ));
test("quarterly and monthly compounding exceed annual with same rate", () => {
  const f = {
    principal: 10000,
    annualRate: 8,
    startDate: "2025-01-01",
    maturityDate: "2026-01-01",
  };
  assert.ok(
    depositValue({ ...f, frequency: "Monthly" }).gt(
      depositValue({ ...f, frequency: "Quarterly" }),
    ),
  );
});
test("accrued FD is capped at maturity and floored at start", () => {
  const f = {
    principal: 10000,
    annualRate: 8,
    startDate: "2025-01-01",
    maturityDate: "2026-01-01",
    frequency: "Annual",
  };
  assert.equal(depositValue(f, new Date("2024-01-01")).toString(), "10000");
  assert.equal(depositValue(f, new Date("2030-01-01")).toString(), "10800");
});
test("partial settlements preserve original recoverable and full settlement reaches zero", () => {
  assert.equal(outstanding("500", [{ amount: "125.50" }]).toString(), "374.5");
  assert.equal(
    outstanding("500", [{ amount: "125.50" }, { amount: "374.50" }]).toString(),
    "0",
  );
});
test("reject zero, negative and excessive settlement amounts", () => {
  for (const n of ["0", "-1", "501"])
    assert.throws(() => validateSettlement(n, 500));
  assert.doesNotThrow(() => validateSettlement("500", 500));
});
test("empty monthly report has safe zero totals", () => {
  const r = monthly([], "2026-10");
  assert.equal(r.rows.length, 0);
  assert.equal(r.spending.toString(), "0");
  assert.equal(r.income.toString(), "0");
});
test("monthly totals use same consumption definition", () => {
  const r = monthly(
    [
      entry("Expense", "10"),
      entry("Expense", "20", { consumption: false }),
      entry("Transfer", "50"),
      entry("Investment", "100"),
      entry("Income", "200"),
    ],
    "2026-10",
  );
  assert.equal(r.spending.toString(), "10");
  assert.equal(r.outflow.toString(), "180");
  assert.equal(r.income.toString(), "200");
  assert.equal(r.transfers.toString(), "50");
});
test("India month boundary uses Asia/Kolkata", () =>
  assert.equal(monthKey("2026-09-30T20:00:00Z"), "2026-10"));
test("Indian currency formatting", () =>
  assert.equal(money("125000.50"), "₹1,25,000.50"));
test("CSV escapes quotes, newlines and formula injection", () => {
  assert.equal(csvCell('a,"b"\nc'), '"a,""b""\nc"');
  for (const v of ['=HYPERLINK("x")', " +1", "-1", "@SUM(A1)", "\t1"])
    assert.ok(csvCell(v).startsWith("\"'"));
});
