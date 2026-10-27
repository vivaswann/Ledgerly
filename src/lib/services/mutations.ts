import { Prisma, PrismaClient } from "@prisma/client";
import { schemas, type Entity } from "../validations";
import { D, outstanding, validateSettlement } from "../finance";
import { ValidationError } from "../errors";
type Client = Prisma.TransactionClient;
export class AccessError extends Error {
  constructor() {
    super("Record not found.");
  }
}
async function account(
  tx: Client,
  userId: string,
  id: string,
  existing?: string | null,
) {
  const row = await tx.account.findFirst({ where: { id, userId } });
  if (!row) throw new AccessError();
  if (row.archived && id !== existing)
    throw new ValidationError("Choose an active account.");
  return row;
}
async function lockSplit(tx: Client, userId: string, id: string) {
  const rows = await tx.$queryRaw<
    { id: string }[]
  >`SELECT id FROM "SplitTracker" WHERE id=${id} AND "userId"=${userId} FOR UPDATE`;
  if (!rows.length) throw new AccessError();
}
export async function mutate(
  db: PrismaClient,
  userId: string,
  entity: Entity,
  raw: unknown,
  id?: string,
) {
  if (!userId) throw new AccessError();
  return db.$transaction(
    async (tx) => {
      const where = id ? { id, userId } : undefined;
      switch (entity) {
        case "account": {
          const data = schemas.account.parse(raw);
          if (where && !(await tx.account.findFirst({ where })))
            throw new AccessError();
          return where
            ? tx.account.update({ where, data })
            : tx.account.create({ data: { ...data, userId } });
        }
        case "category": {
          const data = schemas.category.parse(raw);
          if (where) {
            const old = await tx.category.findFirst({ where });
            if (!old) throw new AccessError();
            if (
              old.type !== data.type &&
              (await tx.transaction.count({
                where: { userId, categoryId: id },
              }))
            )
              throw new ValidationError(
                "A category with history cannot change type.",
              );
          }
          return where
            ? tx.category.update({ where, data })
            : tx.category.create({ data: { ...data, userId } });
        }
        case "transaction": {
          const data = schemas.transaction.parse(raw),
            old = where ? await tx.transaction.findFirst({ where }) : null;
          if (where && !old) throw new AccessError();
          await account(tx, userId, data.accountId, old?.accountId);
          if (data.type === "Transfer") {
            if (!data.destinationId || data.destinationId === data.accountId)
              throw new ValidationError(
                "Choose a different destination account.",
              );
            await account(tx, userId, data.destinationId, old?.destinationId);
          } else data.destinationId = null;
          if (["Expense", "Income"].includes(data.type)) {
            if (!data.categoryId)
              throw new ValidationError("Choose a category.");
            const c = await tx.category.findFirst({
              where: { id: data.categoryId, userId },
            });
            if (!c) throw new AccessError();
            if (
              c.type !== data.type ||
              (c.archived && old?.categoryId !== c.id)
            )
              throw new ValidationError(
                "Choose an active category matching the transaction type.",
              );
          } else data.categoryId = null;
          data.consumption = data.type === "Expense" && data.consumption;
          return where
            ? tx.transaction.update({ where, data })
            : tx.transaction.create({ data: { ...data, userId } });
        }
        case "stock": {
          const data = schemas.stock.parse(raw),
            old = where ? await tx.stockHolding.findFirst({ where }) : null;
          if (where && !old) throw new AccessError();
          if (data.accountId)
            await account(tx, userId, data.accountId, old?.accountId);
          const prices = {
            ...data,
            priceSource: "Manual",
            lastPriceUpdate: new Date(),
          };
          return where
            ? tx.stockHolding.update({ where, data: prices })
            : tx.stockHolding.create({ data: { ...prices, userId } });
        }
        case "deposit": {
          const data = schemas.deposit.parse(raw),
            old = where ? await tx.fixedDeposit.findFirst({ where }) : null;
          if (where && !old) throw new AccessError();
          if (data.accountId)
            await account(tx, userId, data.accountId, old?.accountId);
          return where
            ? tx.fixedDeposit.update({ where, data })
            : tx.fixedDeposit.create({ data: { ...data, userId } });
        }
        case "split": {
          const { friendName, ...data } = schemas.split.parse(raw);
          if (D(data.recoverable).gt(data.totalAmount))
            throw new ValidationError(
              "Recoverable amount cannot exceed the total expense.",
            );
          await account(tx, userId, data.accountId);
          const name = friendName.toLocaleLowerCase("en-IN"),
            friend = await tx.friend.upsert({
              where: { userId_name: { userId, name } },
              create: { userId, name },
              update: {},
            });
          return tx.splitTracker.create({
            data: { ...data, friendId: friend.id, userId },
          });
        }
        case "settlement": {
          const data = schemas.settlement.parse(raw);
          await lockSplit(tx, userId, data.splitId);
          const s = await tx.splitTracker.findFirst({
            where: { id: data.splitId, userId },
            include: { settlements: true },
          });
          if (!s) throw new AccessError();
          validateSettlement(
            data.amount,
            outstanding(s.recoverable, s.settlements),
          );
          if (data.date < s.date)
            throw new ValidationError("Repayment cannot predate the split.");
          return tx.settlement.create({ data: { ...data, userId } });
        }
        case "bulk": {
          const data = schemas.bulk.parse(raw);
          if (
            !(await tx.friend.findFirst({
              where: { id: data.friendId, userId },
            }))
          )
            throw new AccessError();
          await tx.$queryRaw`SELECT id FROM "SplitTracker" WHERE "friendId"=${data.friendId} AND "userId"=${userId} ORDER BY id FOR UPDATE`;
          const splits = await tx.splitTracker.findMany({
            where: { friendId: data.friendId, userId },
            include: { settlements: true },
            orderBy: { id: "asc" },
          });
          for (const s of splits) {
            const amount = outstanding(s.recoverable, s.settlements);
            if (amount.gt(0)) {
              if (data.date < s.date)
                throw new ValidationError("Repayment cannot predate a split.");
              await tx.settlement.create({
                data: {
                  splitId: s.id,
                  userId,
                  amount: amount.toFixed(2),
                  date: data.date,
                  notes: data.notes,
                },
              });
            }
          }
          return { id: data.friendId };
        }
        case "preference": {
          const data = schemas.preference.parse(raw);
          return tx.preference.upsert({
            where: { userId },
            create: { ...data, userId },
            update: data,
          });
        }
      }
    },
    { timeout: 15000 },
  );
}
export async function remove(
  db: PrismaClient,
  userId: string,
  entity: string,
  id: string,
) {
  if (!userId) throw new AccessError();
  const result =
    entity === "transaction"
      ? await db.transaction.deleteMany({ where: { id, userId } })
      : entity === "stock"
        ? await db.stockHolding.deleteMany({ where: { id, userId } })
        : null;
  if (!result)
    throw new ValidationError("This record must be archived instead.");
  if (!result.count) throw new AccessError();
}
