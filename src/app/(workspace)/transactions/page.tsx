import { requireUser } from "@/lib/session";
import Link from "next/link";
import { db } from "@/lib/db";
import {
  getOptions,
  ledgerWhere,
  ledgerOrder,
  type Filters,
} from "@/lib/services/queries";
import { EntityForm, DeleteButton } from "@/components/forms/entity-form";
import {
  PageHeader,
  Panel,
  Empty,
  TransactionRows,
} from "@/components/data-ui";
import { Button } from "@/components/ui/button";
import { paymentMethods } from "@/lib/validations";
import { nowLocal } from "@/lib/formatters";
export const dynamic = "force-dynamic";
export default async function Transactions({
  searchParams,
}: {
  searchParams: Promise<Filters>;
}) {
  const { id: userId } = await requireUser();
  const f = await searchParams,
    where = ledgerWhere(userId, f),
    { accounts, categories, prefs } = await getOptions(userId);
  const total = await db.transaction.count({ where }),
    pages = Math.max(1, Math.ceil(total / 20)),
    page = Math.min(pages, Math.max(1, Math.floor(Number(f.page) || 1)));
  const rows = await db.transaction.findMany({
    where,
    include: { account: true, category: true, destination: true },
    orderBy: ledgerOrder(f),
    skip: (page - 1) * 20,
    take: 20,
  });
  const options = {
    accounts: accounts.map((a) => ({
      id: a.id,
      name: a.name,
      archived: a.archived,
    })),
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      archived: c.archived,
    })),
  };
  const qs = new URLSearchParams(
    Object.entries(f).filter(
      (x): x is [string, string] => typeof x[1] === "string",
    ),
  );
  const pageLink = (n: number) => {
    const p = new URLSearchParams(qs);
    p.set("page", String(n));
    return "/transactions?" + p;
  };
  return (
    <>
      <PageHeader
        eyebrow="EVERY RUPEE, ACCOUNTED FOR"
        title="Transactions"
        description="Your everyday money, in one clear ledger."
      >
        <Button variant="outline" asChild>
          <a href={"/api/export?" + qs}>Export CSV</a>
        </Button>
        <EntityForm
          entity="transaction"
          label="Add transaction"
          {...options}
          initial={{ date: nowLocal(), paymentMethod: prefs?.defaultPayment }}
        />
      </PageHeader>
      <form className="filter-bar" method="get">
        <label className="search-filter">
          <span>Search</span>
          <input
            name="q"
            defaultValue={f.q}
            placeholder="Description or notes…"
          />
        </label>
        <label>
          <span>Account</span>
          <select name="account" defaultValue={f.account}>
            <option value="">All accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Type</span>
          <select name="type" defaultValue={f.type}>
            <option value="">All types</option>
            {["Expense", "Income", "Transfer", "Investment"].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Category</span>
          <select name="category" defaultValue={f.category}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Payment</span>
          <select name="payment" defaultValue={f.payment}>
            <option value="">All methods</option>
            {paymentMethods.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
        <label>
          <span>From</span>
          <input type="date" name="from" defaultValue={f.from} />
        </label>
        <label>
          <span>To</span>
          <input type="date" name="to" defaultValue={f.to} />
        </label>
        <label>
          <span>Sort by</span>
          <select name="sort" defaultValue={f.sort}>
            <option value="date">Date</option>
            <option value="amount">Amount</option>
          </select>
        </label>
        <label>
          <span>Order</span>
          <select name="order" defaultValue={f.order}>
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </label>
        <Button type="submit" variant="outline">
          Apply filters
        </Button>
        <Link className="text-link" href="/transactions">
          Clear
        </Link>
      </form>
      <Panel
        title="Transaction ledger"
        subtitle={`${total} matching ${total === 1 ? "transaction" : "transactions"}`}
      >
        {rows.length ? (
          <TransactionRows
            rows={rows}
            actions={(id) => {
              const t = rows.find((r) => r.id === id)!;
              const initial = {
                ...(JSON.parse(JSON.stringify(t)) as Record<string, unknown>),
                amount: t.amount.toFixed(2),
                date: new Date(t.date.getTime() + 330 * 60000)
                  .toISOString()
                  .slice(0, 16),
                notes: t.notes || "",
                categoryId: t.categoryId || "",
                destinationId: t.destinationId || "",
              };
              return (
                <>
                  <EntityForm
                    entity="transaction"
                    label="Edit"
                    title="Edit transaction"
                    variant="ghost"
                    small
                    {...options}
                    initial={initial}
                  />
                  <EntityForm
                    entity="transaction"
                    label="Duplicate"
                    title="Duplicate transaction"
                    variant="ghost"
                    small
                    {...options}
                    initial={{ ...initial, id: undefined }}
                  />
                  <DeleteButton entity="transaction" id={id} />
                </>
              );
            }}
          />
        ) : (
          <Empty
            title={total ? "No matching transactions" : "A clean slate"}
            description="Add a transaction or adjust your filters to find what you need."
          />
        )}
        <div className="pagination">
          <span>
            Page {page} of {pages} · 20 per page
          </span>
          <div>
            {page > 1 && (
              <Button variant="outline" size="sm" asChild>
                <Link href={pageLink(page - 1)}>Previous</Link>
              </Button>
            )}
            {page < pages && (
              <Button variant="outline" size="sm" asChild>
                <Link href={pageLink(page + 1)}>Next</Link>
              </Button>
            )}
          </div>
        </div>
      </Panel>
    </>
  );
}
