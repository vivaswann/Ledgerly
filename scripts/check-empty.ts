import "dotenv/config";
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
try {
  const records = {
    users: await db.user.count(),
    sessions: await db.session.count(),
    accounts: await db.account.count(),
    transactions: await db.transaction.count(),
    holdings: await db.stockHolding.count(),
    deposits: await db.fixedDeposit.count(),
    friends: await db.friend.count(),
    splits: await db.splitTracker.count(),
    settlements: await db.settlement.count(),
    categories: await db.category.count(),
  };
  console.log(JSON.stringify(records, null, 2));
  if (Object.values(records).some((count) => count !== 0))
    throw Error(
      "Database is not the expected empty first-run database. No records were modified.",
    );
} finally {
  await db.$disconnect();
}
