import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { testPostgres } from "./postgres";
import { seedUser } from "../src/lib/defaults";
import { mutate, remove, AccessError } from "../src/lib/services/mutations";
import { getOptions, ledgerWhere } from "../src/lib/services/queries";
const pg = await testPostgres(),
  db = pg.db;
const alice = crypto.randomUUID(),
  bob = crypto.randomUUID();
let a: string,
  b: string,
  ac: string,
  bc: string,
  entryId: string,
  stockId: string,
  depositId: string,
  splitId: string,
  friendId: string;
before(async () => {
  await db.user.createMany({
    data: [
      { id: alice, name: "Alice", email: "alice@example.test" },
      { id: bob, name: "Bob", email: "bob@example.test" },
    ],
  });
  await seedUser(db, alice);
  await seedUser(db, bob);
  a = (
    await mutate(db, alice, "account", {
      name: "Same bank name",
      type: "Bank",
      currency: "INR",
      openingBalance: "1000",
    })
  ).id;
  b = (
    await mutate(db, bob, "account", {
      name: "Same bank name",
      type: "Bank",
      currency: "INR",
      openingBalance: "2000",
    })
  ).id;
  ac = (
    await db.category.findFirstOrThrow({
      where: { userId: alice, type: "Expense" },
    })
  ).id;
  bc = (
    await db.category.findFirstOrThrow({
      where: { userId: bob, type: "Expense" },
    })
  ).id;
  entryId = (
    await mutate(db, alice, "transaction", {
      date: "2026-10-01",
      amount: "10",
      type: "Expense",
      accountId: a,
      categoryId: ac,
      description: "Alice private",
      paymentMethod: "Other",
    })
  ).id;
  stockId = (
    await mutate(db, alice, "stock", {
      ticker: "PRIVATE",
      companyName: "Private holding",
      shares: "1",
      averagePrice: "10",
      currentPrice: "20",
      purchaseDate: "2026-10-01",
      accountId: a,
    })
  ).id;
  depositId = (
    await mutate(db, alice, "deposit", {
      bankName: "Private FD",
      principal: "100",
      annualRate: "7",
      startDate: "2026-10-01",
      maturityDate: "2027-10-01",
      frequency: "Annual",
      status: "Active",
      accountId: a,
    })
  ).id;
  splitId = (
    await mutate(db, alice, "split", {
      friendName: "Same friend",
      purpose: "Private split",
      totalAmount: "100",
      recoverable: "50",
      date: "2026-10-01",
      accountId: a,
    })
  ).id;
  friendId = (
    await db.splitTracker.findUniqueOrThrow({ where: { id: splitId } })
  ).friendId;
});
after(async () => pg.close());
const expense = (accountId: string, categoryId: string) => ({
  date: "2026-10-01",
  amount: "10",
  type: "Expense",
  accountId,
  categoryId,
  description: "Attempt",
  paymentMethod: "Other",
});
test("each user gets independent default categories and preferences", async () => {
  const ao = await getOptions(alice, db),
    bo = await getOptions(bob, db);
  assert.equal(ao.categories.length, 16);
  assert.equal(bo.categories.length, 16);
  assert.equal(ao.accounts[0].id, a);
  assert.equal(bo.accounts[0].id, b);
  assert.ok(ao.categories.every((c) => c.userId === alice));
  assert.notEqual(ao.prefs?.id, bo.prefs?.id);
  await mutate(db, bob, "preference", {
    reportingPeriod: "year",
    defaultPayment: "Cash",
  });
  assert.equal((await getOptions(alice, db)).prefs?.reportingPeriod, "month");
});
test("queries remain owner-scoped when an attacker supplies account/category IDs", async () => {
  for (const filters of [
    {},
    { account: a },
    { category: ac },
    { q: "Alice private" },
    { userId: alice },
  ])
    assert.equal(
      await db.transaction.count({ where: ledgerWhere(bob, filters) }),
      0,
    );
  assert.equal(
    await db.transaction.count({ where: ledgerWhere(alice, {}) }),
    1,
  );
  assert.throws(() => ledgerWhere("", {}));
});
test("cross-user account/category creation references and transfer destinations are rejected", async () => {
  await assert.rejects(
    mutate(db, bob, "transaction", expense(a, bc)),
    AccessError,
  );
  await assert.rejects(
    mutate(db, bob, "transaction", expense(b, ac)),
    AccessError,
  );
  await assert.rejects(
    mutate(db, bob, "transaction", {
      ...expense(b, bc),
      type: "Transfer",
      destinationId: a,
    }),
    AccessError,
  );
});
test("editing, archiving, and deleting another user’s account, category, transaction, or asset fails", async () => {
  await assert.rejects(
    mutate(
      db,
      bob,
      "account",
      {
        name: "stolen",
        type: "Bank",
        currency: "INR",
        openingBalance: "0",
        archived: true,
      },
      a,
    ),
    AccessError,
  );
  await assert.rejects(
    mutate(db, bob, "category", { name: "stolen", type: "Expense" }, ac),
    AccessError,
  );
  await assert.rejects(
    mutate(db, bob, "transaction", expense(b, bc), entryId),
    AccessError,
  );
  await assert.rejects(
    mutate(
      db,
      bob,
      "stock",
      {
        ticker: "stolen",
        companyName: "stolen",
        shares: "1",
        averagePrice: "1",
        currentPrice: "1",
        purchaseDate: "2026-10-01",
      },
      stockId,
    ),
    AccessError,
  );
  await assert.rejects(
    mutate(
      db,
      bob,
      "deposit",
      {
        bankName: "stolen",
        principal: "1",
        annualRate: "1",
        startDate: "2026-10-01",
        maturityDate: "2027-10-01",
        frequency: "Annual",
        status: "Archived",
      },
      depositId,
    ),
    AccessError,
  );
  await assert.rejects(remove(db, bob, "transaction", entryId), AccessError);
  await assert.rejects(remove(db, bob, "stock", stockId), AccessError);
  assert.equal(
    (await db.account.findUniqueOrThrow({ where: { id: a } })).name,
    "Same bank name",
  );
});
test("cross-user holdings, deposits, splits, settlements and bulk settlements fail", async () => {
  await assert.rejects(
    mutate(db, bob, "stock", {
      ticker: "bad",
      companyName: "bad",
      shares: "1",
      averagePrice: "1",
      currentPrice: "1",
      purchaseDate: "2026-10-01",
      accountId: a,
    }),
    AccessError,
  );
  await assert.rejects(
    mutate(db, bob, "deposit", {
      bankName: "bad",
      principal: "1",
      annualRate: "1",
      startDate: "2026-10-01",
      maturityDate: "2027-10-01",
      frequency: "Annual",
      status: "Active",
      accountId: a,
    }),
    AccessError,
  );
  await assert.rejects(
    mutate(db, bob, "split", {
      friendName: "bad",
      purpose: "bad",
      totalAmount: "100",
      recoverable: "50",
      date: "2026-10-01",
      accountId: a,
    }),
    AccessError,
  );
  await assert.rejects(
    mutate(db, bob, "settlement", { splitId, amount: "1", date: "2026-10-02" }),
    AccessError,
  );
  await assert.rejects(
    mutate(db, bob, "bulk", { friendId, date: "2026-10-02" }),
    AccessError,
  );
  assert.equal(await db.settlement.count(), 0);
});
test("request-body userId cannot choose record ownership", async () => {
  const row = await mutate(db, bob, "transaction", {
    ...expense(b, bc),
    userId: alice,
  });
  assert.equal(
    (await db.transaction.findUniqueOrThrow({ where: { id: row.id } })).userId,
    bob,
  );
});
test("composite foreign keys reject cross-user links even if application validation is bypassed", async () => {
  await assert.rejects(
    db.transaction.create({
      data: { ...expense(a, bc), date: new Date("2026-10-01"), userId: bob },
    }),
  );
  await assert.rejects(
    db.settlement.create({
      data: { userId: bob, splitId, amount: "1", date: new Date("2026-10-02") },
    }),
  );
  await assert.rejects(
    db.stockHolding.create({
      data: {
        userId: bob,
        ticker: "bad",
        companyName: "bad",
        shares: "1",
        averagePrice: "1",
        currentPrice: "1",
        purchaseDate: new Date(),
        accountId: a,
      },
    }),
  );
});
test("friend names are unique within a user, not globally", async () => {
  await mutate(db, bob, "split", {
    friendName: "Same friend",
    purpose: "Bob split",
    totalAmount: "50",
    recoverable: "20",
    date: "2026-10-01",
    accountId: b,
  });
  assert.equal(await db.friend.count({ where: { name: "same friend" } }), 2);
});
