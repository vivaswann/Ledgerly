import type { Prisma } from "@prisma/client";
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
  for (const [type, names] of [
    ["Expense", expenseCategories],
    ["Income", ["Salary", "Allowance", "Interest", "Gifts", "Other Income"]],
  ] as const) {
    for (const name of names)
      await db.category.upsert({
        where: { userId_name_type: { userId, name, type } },
        create: { userId, name, type },
        update: {},
      });
  }
  await db.preference.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
}
