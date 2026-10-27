import { Prisma, type PrismaClient } from "@prisma/client";
import { db } from "../db";
export type Filters = Record<string, string | undefined>;
export function ledgerWhere(
  userId: string,
  f: Filters,
): Prisma.TransactionWhereInput {
  if (!userId) throw Error("Authentication required");
  const where: Prisma.TransactionWhereInput = { userId };
  if (f.q)
    where.OR = [
      { description: { contains: f.q } },
      { notes: { contains: f.q } },
    ];
  if (f.account)
    where.AND = [
      { OR: [{ accountId: f.account }, { destinationId: f.account }] },
    ];
  if (f.category) where.categoryId = f.category;
  if (f.type) where.type = f.type;
  if (f.payment) where.paymentMethod = f.payment;
  if (f.from || f.to) {
    const gte = f.from ? new Date(f.from + "T00:00:00+05:30") : undefined;
    const lt = f.to
      ? new Date(new Date(f.to + "T00:00:00+05:30").getTime() + 86400000)
      : undefined;
    if (
      (gte && !Number.isFinite(gte.getTime())) ||
      (lt && !Number.isFinite(lt.getTime()))
    )
      throw Error("Invalid date filter");
    where.date = { gte, lt };
  }
  return where;
}
export const ledgerOrder = (
  f: Filters,
): Prisma.TransactionOrderByWithRelationInput[] => [
  {
    [f.sort === "amount" ? "amount" : "date"]:
      f.order === "asc" ? "asc" : "desc",
  },
  { id: "desc" },
];
export async function getOptions(userId: string, client: PrismaClient = db) {
  if (!userId) throw Error("Authentication required");
  const [accounts, categories, prefs] = await Promise.all([
    client.account.findMany({ where: { userId }, orderBy: { name: "asc" } }),
    client.category.findMany({ where: { userId }, orderBy: { name: "asc" } }),
    client.preference.findUnique({ where: { userId } }),
  ]);
  return { accounts, categories, prefs };
}
