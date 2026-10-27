import { test, expect, type APIRequestContext } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { resetBrowserDatabase } from "./reset";
const origin = "http://127.0.0.1:3100";
test.beforeEach(resetBrowserDatabase);
test("sign out, invalid password, sign in, sign up, and session revocation", async ({
  page,
  browser,
}) => {
  await page.goto("/");
  await expect(
    page.getByText("browser@example.test", { exact: true }),
  ).toBeVisible();
  const stolenCookies = await page.context().cookies();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  const replay = await browser.newContext();
  await replay.addCookies(stolenCookies);
  expect((await replay.request.get(origin + "/api/export")).status()).toBe(401);
  await replay.close();
  await page.getByLabel("Email address").fill("browser@example.test");
  await page.getByLabel("Password", { exact: true }).fill("Wrong-password-123");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByText("Email or password is incorrect. Please try again.", {
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByLabel("Password", { exact: true })
    .fill("Browser-test-passphrase-123");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Set up your finances" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page
    .getByRole("link", { name: "Create an account", exact: true })
    .click();
  await page.getByLabel("Your name").fill("New user");
  await page.getByLabel("Email address").fill("new-user@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("New-user-test-passphrase-123");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Set up your finances" }),
  ).toBeVisible();
  await expect(
    page.getByText("new-user@example.test", { exact: true }),
  ).toBeVisible();
});
test("unauthenticated pages redirect and financial APIs reject requests", async ({
  browser,
}) => {
  const context = await browser.newContext(),
    page = await context.newPage();
  for (const path of [
    "/",
    "/accounts",
    "/transactions",
    "/monthly-recap",
    "/investments",
    "/splits",
    "/categories",
    "/settings",
  ]) {
    await page.goto(origin + path);
    await expect(page).toHaveURL(/\/login$/);
  }
  expect((await context.request.get(origin + "/api/export")).status()).toBe(
    401,
  );
  expect(
    (
      await context.request.post(origin + "/api/account", {
        headers: { origin },
        data: { name: "Attack" },
      })
    ).status(),
  ).toBe(401);
  expect(
    (
      await context.request.delete(origin + "/api/transaction", {
        headers: { origin },
        data: { id: crypto.randomUUID() },
      })
    ).status(),
  ).toBe(401);
  await context.close();
});
test("two signed-in users cannot see, export, alter, link, or settle each other’s finances", async ({
  page,
  browser,
}) => {
  const alice = page.context(),
    bob = await browser.newContext();
  const signup = await bob.request.post(origin + "/api/auth/sign-up/email", {
    headers: { origin },
    data: {
      name: "Other user",
      email: "other@example.test",
      password: "Other-user-test-passphrase-123",
    },
  });
  expect(signup.ok()).toBe(true);
  const save = async (
    request: APIRequestContext,
    entity: string,
    data: unknown,
  ) => {
    const r = await request.post(origin + "/api/" + entity, {
      headers: { origin },
      data,
    });
    expect(r.ok(), await r.text()).toBe(true);
  };
  await save(alice.request, "account", {
    name: "Alice private bank",
    type: "Bank",
    currency: "INR",
    openingBalance: "1000",
  });
  await save(bob.request, "account", {
    name: "Bob private bank",
    type: "Bank",
    currency: "INR",
    openingBalance: "2000",
  });
  const db = new PrismaClient({
    datasourceUrl: process.env.LEDGERLY_BROWSER_DATABASE_URL,
  });
  try {
    const a = await db.account.findFirstOrThrow({
        where: { name: "Alice private bank" },
      }),
      b = await db.account.findFirstOrThrow({
        where: { name: "Bob private bank" },
      }),
      ac = await db.category.findFirstOrThrow({
        where: { userId: a.userId, type: "Expense" },
      }),
      bc = await db.category.findFirstOrThrow({
        where: { userId: b.userId, type: "Expense" },
      });
    await save(alice.request, "transaction", {
      amount: "25",
      type: "Expense",
      accountId: a.id,
      categoryId: ac.id,
      description: "Alice secret expense",
      paymentMethod: "Other",
      date: "2026-10-01",
    });
    await save(alice.request, "stock", {
      ticker: "ALICEPRIVATE",
      companyName: "Alice private company",
      shares: "1",
      averagePrice: "10",
      currentPrice: "12",
      purchaseDate: "2026-10-01",
    });
    await save(alice.request, "deposit", {
      bankName: "Alice private FD",
      principal: "100",
      annualRate: "7",
      startDate: "2026-10-01",
      maturityDate: "2027-10-01",
      frequency: "Annual",
      status: "Active",
    });
    await save(alice.request, "split", {
      friendName: "Alice private friend",
      purpose: "Alice private purpose",
      totalAmount: "25",
      recoverable: "10",
      accountId: a.id,
      date: "2026-10-01",
    });
    const transaction = await db.transaction.findFirstOrThrow({
        where: { userId: a.userId },
      }),
      holding = await db.stockHolding.findFirstOrThrow({
        where: { userId: a.userId },
      }),
      split = await db.splitTracker.findFirstOrThrow({
        where: { userId: a.userId },
      });
    const bobPage = await bob.newPage();
    for (const path of [
      "/",
      "/transactions",
      "/monthly-recap?month=2026-10",
      "/accounts",
      "/investments",
      "/splits",
      "/categories",
      "/settings",
      "/transactions?account=" + a.id,
    ]) {
      await bobPage.goto(origin + path);
      await expect(bobPage.locator("body")).not.toContainText("Alice private");
      await expect(bobPage.locator("body")).not.toContainText("Alice secret");
      await expect(bobPage.locator("body")).not.toContainText("ALICEPRIVATE");
    }
    const exportResult = await bob.request.get(
      origin + "/api/export?userId=" + a.userId + "&account=" + a.id,
    );
    expect(exportResult.ok()).toBe(true);
    expect(await exportResult.text()).not.toContain("Alice secret");
    const attacks: [string, unknown][] = [
      [
        "account",
        {
          id: a.id,
          name: "Stolen",
          type: "Bank",
          currency: "INR",
          openingBalance: "0",
        },
      ],
      ["category", { id: ac.id, name: "Stolen", type: "Expense" }],
      [
        "transaction",
        {
          id: transaction.id,
          amount: "1",
          type: "Expense",
          accountId: b.id,
          categoryId: bc.id,
          description: "Attack",
          paymentMethod: "Other",
          date: "2026-10-01",
        },
      ],
      [
        "transaction",
        {
          amount: "1",
          type: "Transfer",
          accountId: b.id,
          destinationId: a.id,
          description: "Attack",
          paymentMethod: "Other",
          date: "2026-10-01",
        },
      ],
      [
        "transaction",
        {
          amount: "1",
          type: "Expense",
          accountId: b.id,
          categoryId: ac.id,
          description: "Attack",
          paymentMethod: "Other",
          date: "2026-10-01",
        },
      ],
      ["settlement", { splitId: split.id, amount: "1", date: "2026-10-02" }],
      ["bulk", { friendId: split.friendId, date: "2026-10-02" }],
    ];
    for (const [entity, data] of attacks)
      expect(
        (
          await bob.request.post(origin + "/api/" + entity, {
            headers: { origin },
            data,
          })
        ).status(),
      ).toBe(404);
    for (const [entity, id] of [
      ["transaction", transaction.id],
      ["stock", holding.id],
    ])
      expect(
        (
          await bob.request.delete(origin + "/api/" + entity, {
            headers: { origin },
            data: { id },
          })
        ).status(),
      ).toBe(404);
    expect(
      (
        await alice.request.post(origin + "/api/account", {
          headers: { origin: "https://evil.example" },
          data: { name: "CSRF" },
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await db.transaction.findUniqueOrThrow({
          where: { id: transaction.id },
        })
      ).description,
    ).toBe("Alice secret expense");
  } finally {
    await db.$disconnect();
    await bob.close();
  }
});
