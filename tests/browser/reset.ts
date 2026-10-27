import { PrismaClient } from "@prisma/client";
import type { Page } from "@playwright/test";
export async function resetBrowserDatabase({ page }: { page: Page }) {
  const url = process.env.DATABASE_URL || "";
  if (
    !process.env.LEDGERLY_BROWSER_DATABASE_URL ||
    url !== process.env.LEDGERLY_BROWSER_DATABASE_URL ||
    !url.includes("127.0.0.1:")
  )
    throw Error(
      "Reset requires the browser runner’s isolated PostgreSQL-compatible database.",
    );
  const db = new PrismaClient({ datasourceUrl: url });
  try {
    await db.$transaction([
      db.settlement.deleteMany(),
      db.splitTracker.deleteMany(),
      db.friend.deleteMany(),
      db.transaction.deleteMany(),
      db.stockHolding.deleteMany(),
      db.fixedDeposit.deleteMany(),
      db.account.deleteMany(),
      db.category.deleteMany(),
      db.preference.deleteMany(),
      db.session.deleteMany(),
      db.authAccount.deleteMany(),
      db.user.deleteMany(),
      db.verification.deleteMany(),
      db.rateLimit.deleteMany(),
    ]);
  } finally {
    await db.$disconnect();
  }
  const response = await page.request.post("/api/auth/sign-up/email", {
    headers: { origin: "http://127.0.0.1:3100" },
    data: {
      email: "browser@example.test",
      password: "Browser-test-passphrase-123",
      name: "Browser user",
    },
  });
  if (!response.ok())
    throw Error("Test registration failed: " + (await response.text()));
}
