import { testPostgres } from "./postgres";
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { seed } from "../prisma/seed";
import { mutate } from "../src/lib/services/mutations";
import { balance, outstanding, sum, D } from "../src/lib/finance";
import { ledgerWhere } from "../src/lib/services/queries";
const pg = await testPostgres();
const db = pg.db,
  userId = crypto.randomUUID();
let a: string, b: string, expenseCategory: string, incomeCategory: string;
before(async () => {
  await db.user.create({
    data: {
      id: userId,
      name: "Integration user",
      email: "integration@example.test",
    },
  });
  await seed(db, userId);
});
after(async () => {
  await pg.close();
});
test("fresh initialization has only default categories and configuration; seed is idempotent", async () => {
  await seed(db, userId);
  assert.equal(await db.category.count(), 16);
  for (const model of [
    db.account,
    db.transaction,
    db.stockHolding,
    db.fixedDeposit,
    db.friend,
    db.splitTracker,
    db.settlement,
  ])
    assert.equal(await (model.count as () => Promise<number>)(), 0);
});
test("create accounts and categories, enforce validation", async () => {
  const one = await mutate(db, userId, "account", {
    name: "Test bank",
    type: "Bank",
    currency: "INR",
    openingBalance: "1000",
  });
  const two = await mutate(db, userId, "account", {
    name: "Test cash",
    type: "Cash",
    currency: "INR",
    openingBalance: "0",
  });
  a = one.id;
  b = two.id;
  expenseCategory = (
    await db.category.findFirstOrThrow({ where: { type: "Expense" } })
  ).id;
  incomeCategory = (
    await db.category.findFirstOrThrow({ where: { type: "Income" } })
  ).id;
  await assert.rejects(
    mutate(db, userId, "account", {
      name: "Bad",
      type: "Bank",
      currency: "USD",
      openingBalance: "0",
    }),
  );
});
const tx = (type: string, amount = "100") => ({
  type,
  amount,
  accountId: a,
  description: "Integration test",
  date: "2026-10-01",
  categoryId: type === "Income" ? incomeCategory : expenseCategory,
  paymentMethod: "Other",
  consumption: true,
});
test("expense creation, editing, deletion and income update derived balances", async () => {
  const r = await mutate(db, userId, "transaction", tx("Expense", "20.10"));
  assert.equal(
    balance(
      await db.account.findUniqueOrThrow({ where: { id: a } }),
      await db.transaction.findMany(),
    ).toFixed(2),
    "979.90",
  );
  await mutate(db, userId, "transaction", tx("Expense", "30.20"), r.id);
  assert.equal(
    balance(
      await db.account.findUniqueOrThrow({ where: { id: a } }),
      await db.transaction.findMany(),
    ).toFixed(2),
    "969.80",
  );
  await db.transaction.delete({ where: { id: r.id } });
  await mutate(db, userId, "transaction", tx("Income", "50"));
  assert.equal(
    balance(
      await db.account.findUniqueOrThrow({ where: { id: a } }),
      await db.transaction.findMany(),
    ).toString(),
    "1050",
  );
});
test("transfer is atomic and conserved, same-account and incompatible-category rejected", async () => {
  await mutate(db, userId, "transaction", {
    ...tx("Transfer", "200"),
    destinationId: b,
  });
  const accounts = await db.account.findMany(),
    rows = await db.transaction.findMany();
  assert.equal(sum(accounts.map((a) => balance(a, rows))).toString(), "1050");
  assert.equal(
    balance(
      accounts.find((x) => x.id === b)!,
      rows,
    ).toString(),
    "200",
  );
  await assert.rejects(
    mutate(db, userId, "transaction", { ...tx("Transfer"), destinationId: a }),
  );
  await assert.rejects(
    mutate(db, userId, "transaction", {
      ...tx("Expense"),
      categoryId: incomeCategory,
    }),
  );
  await assert.rejects(mutate(db, userId, "transaction", tx("Expense", "0")));
});
test("search, account, date and type filters work in the database", async () => {
  const found = await db.transaction.findMany({
    where: ledgerWhere(userId, {
      account: b,
      type: "Transfer",
      from: "2026-10-01",
      to: "2026-10-01",
      q: "Integration",
    }),
  });
  assert.equal(found.length, 1);
});
test("archiving preserves history and rejects new activity", async () => {
  await mutate(
    db,
    userId,
    "account",
    {
      name: "Test cash",
      type: "Cash",
      currency: "INR",
      openingBalance: "0",
      archived: true,
    },
    b,
  );
  assert.equal(await db.transaction.count({ where: { destinationId: b } }), 1);
  await assert.rejects(
    mutate(db, userId, "transaction", { ...tx("Income"), accountId: b }),
  );
});
test("stocks and deposits validate numbers, dates, and references", async () => {
  await mutate(db, userId, "stock", {
    ticker: "TEST",
    companyName: "Test only",
    shares: "1.25",
    averagePrice: "100",
    currentPrice: "110",
    purchaseDate: "2026-10-01",
    accountId: a,
  });
  await mutate(db, userId, "deposit", {
    bankName: "Test bank",
    principal: "500",
    annualRate: "7",
    startDate: "2026-10-01",
    maturityDate: "2027-10-01",
    frequency: "Quarterly",
    status: "Active",
    accountId: a,
  });
  await assert.rejects(
    mutate(db, userId, "deposit", {
      bankName: "Test",
      principal: "1",
      annualRate: "7",
      startDate: "2027-01-01",
      maturityDate: "2026-01-01",
      frequency: "Annual",
      status: "Active",
    }),
  );
});
test("partial, excessive, full and bulk settlements preserve original debts", async () => {
  await mutate(db, userId, "split", {
    friendName: "Test Friend",
    purpose: "Shared meal",
    totalAmount: "500",
    recoverable: "200",
    date: "2026-10-01",
    accountId: a,
  });
  const s = await db.splitTracker.findFirstOrThrow();
  await mutate(db, userId, "settlement", {
    splitId: s.id,
    amount: "50",
    date: "2026-10-02",
  });
  await assert.rejects(
    mutate(db, userId, "settlement", {
      splitId: s.id,
      amount: "151",
      date: "2026-10-03",
    }),
  );
  await mutate(db, userId, "split", {
    friendName: "TEST FRIEND",
    purpose: "Second meal",
    totalAmount: "300",
    recoverable: "100",
    date: "2026-10-02",
    accountId: a,
  });
  await mutate(db, userId, "bulk", {
    friendId: s.friendId,
    date: "2026-10-03",
  });
  const all = await db.splitTracker.findMany({
    include: { settlements: true },
  });
  assert.equal(all.length, 2);
  assert.equal(await db.friend.count(), 1);
  assert.ok(all.every((s) => outstanding(s.recoverable, s.settlements).eq(0)));
  assert.equal(all[0].recoverable.toString(), "200");
  assert.equal(await db.settlement.count(), 3);
});
test("invalid bulk settlement rolls back atomically", async () => {
  await mutate(db, userId, "split", {
    friendName: "Rollback",
    purpose: "Old",
    totalAmount: "100",
    recoverable: "100",
    date: "2026-10-01",
    accountId: a,
  });
  await mutate(db, userId, "split", {
    friendName: "Rollback",
    purpose: "Future",
    totalAmount: "100",
    recoverable: "100",
    date: "2026-10-10",
    accountId: a,
  });
  const f = await db.friend.findUniqueOrThrow({
    where: { userId_name: { userId, name: "rollback" } },
  });
  await assert.rejects(
    mutate(db, userId, "bulk", { friendId: f.id, date: "2026-10-05" }),
  );
  const rows = await db.splitTracker.findMany({
    where: { friendId: f.id },
    include: { settlements: true },
  });
  assert.equal(
    sum(rows.map((s) => outstanding(s.recoverable, s.settlements))).toString(),
    "200",
  );
  assert.equal(rows.flatMap((s) => s.settlements).length, 0);
});
test("concurrent repayments cannot over-settle", async () => {
  const s = await db.splitTracker.findFirstOrThrow({
    where: { friend: { name: "rollback" } },
  });
  const result = await Promise.allSettled([
    mutate(db, userId, "settlement", {
      splitId: s.id,
      amount: "80",
      date: "2026-10-20",
    }),
    mutate(db, userId, "settlement", {
      splitId: s.id,
      amount: "80",
      date: "2026-10-20",
    }),
  ]);
  assert.equal(result.filter((r) => r.status === "fulfilled").length, 1);
  const row = await db.splitTracker.findUniqueOrThrow({
    where: { id: s.id },
    include: { settlements: true },
  });
  assert.ok(D(row.recoverable).gte(sum(row.settlements.map((s) => s.amount))));
});
