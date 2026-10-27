import type { Prisma, PrismaClient } from "@prisma/client";
export const expenseCategories = [
  "Food, Dining & Cafes",
  "Groceries",
  "Room Essentials & Electronics",
  "Personal Care & Grooming",
  "Travel & Transportation",
  "Academics & Stationery",
  "Sports & Fitness",
  "Subscriptions",
  "Health & Wellness",
  "Vending Machine",
  "General & Discretionary",
];
export async function seedUser(db: Prisma.TransactionClient, userId: string) {
  const categories: { userId: string; name: string; type: string }[] = [];
  for (const [type, names] of [
    ["Expense", expenseCategories],
    ["Income", ["Salary", "Allowance", "Interest", "Gifts", "Other Income"]],
  ] as const) {
    for (const name of names) categories.push({ userId, name, type });
  }
  await db.category.createMany({ data: categories, skipDuplicates: true });
  await db.preference.createMany({ data: [{ userId }], skipDuplicates: true });
}
export async function initializeUser(db: PrismaClient, userId: string) {
  const initialized = await db.preference.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (initialized) return;
  await db.$transaction((tx) => seedUser(tx, userId), {
    maxWait: 10000,
    timeout: 30000,
  });
}
