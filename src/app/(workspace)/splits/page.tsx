import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { sum, outstanding, D } from "@/lib/finance";
import { money, dateLabel } from "@/lib/formatters";
import { EntityForm } from "@/components/forms/entity-form";
import { PageHeader, Panel, Empty, Metric } from "@/components/data-ui";
import { Button } from "@/components/ui/button";
export const dynamic = "force-dynamic";
export default async function Splits({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; status?: string }>;
}) {
  const { id: userId } = await requireUser();
  const f = await searchParams;
  const [friends, accounts] = await Promise.all([
    db.friend.findMany({
      where: { userId },
      include: {
        splits: {
          include: {
            settlements: { orderBy: { date: "desc" } },
            account: true,
          },
          orderBy: { date: "desc" },
        },
      },
      orderBy: { name: "asc" },
    }),
    db.account.findMany({ where: { userId } }),
  ]);
  const options = {
    accounts: accounts.map((a) => ({
      id: a.id,
      name: a.name,
      archived: a.archived,
    })),
  };
  const total = sum(
    friends
      .flatMap((f) => f.splits)
      .map((s) => outstanding(s.recoverable, s.settlements)),
  );
  const filtered = friends
    .map((friend) => ({
      ...friend,
      splits: friend.splits.filter((s) => {
        const day = new Date(s.date.getTime() + 330 * 60000)
            .toISOString()
            .slice(0, 10),
          open = outstanding(s.recoverable, s.settlements).gt(0);
        return (
          (!f.from || day >= f.from) &&
          (!f.to || day <= f.to) &&
          (!f.status || (f.status === "open" ? open : !open))
        );
      }),
    }))
    .filter((f) => f.splits.length);
  return (
    <>
      <PageHeader
        eyebrow="GOOD FRIENDS. CLEAR BALANCES."
        title="Splits & Friends"
        description="Remember the moment. Keep track of the money."
      >
        <EntityForm entity="split" label="Record split" {...options} />
      </PageHeader>
      {friends.length > 0 && (
        <div className="metrics two">
          <Metric
            label="Total owed to you"
            value={total}
            detail="Across all friends and dates"
            positive
          />
          <div className="metric">
            <p>Friends with outstanding balances</p>
            <strong>
              {
                friends.filter((f) =>
                  f.splits.some((s) =>
                    outstanding(s.recoverable, s.settlements).gt(0),
                  ),
                ).length
              }
            </strong>
            <small>Partial repayments always preserved</small>
          </div>
        </div>
      )}
      <form className="filter-bar" method="get">
        <label>
          <span>Status</span>
          <select name="status" defaultValue={f.status}>
            <option value="">All splits</option>
            <option value="open">Outstanding</option>
            <option value="settled">Settled</option>
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
        <Button variant="outline">Apply filters</Button>
      </form>
      {filtered.length ? (
        filtered.map((friend) => {
          const full = friends.find((f) => f.id === friend.id)!;
          const balance = sum(
            full.splits.map((s) => outstanding(s.recoverable, s.settlements)),
          );
          return (
            <Panel
              key={friend.id}
              title={friend.name}
              subtitle={`${money(balance)} outstanding · all dates`}
              action={
                balance.gt(0) ? (
                  <EntityForm
                    entity="bulk"
                    label="Settle all"
                    variant="outline"
                    initial={{ friendId: friend.id }}
                  />
                ) : (
                  <span className="badge good">All settled</span>
                )
              }
            >
              <div className="split-list">
                {friend.splits.map((s) => {
                  const remaining = outstanding(s.recoverable, s.settlements);
                  return (
                    <details key={s.id} className="split-detail">
                      <summary>
                        <div>
                          <strong>{s.purpose}</strong>
                          <small>
                            {dateLabel(s.date)} · {s.account.name} · Total
                            expense {money(s.totalAmount)}
                          </small>
                        </div>
                        <div className="split-amount">
                          <strong className={remaining.gt(0) ? "" : "positive"}>
                            {money(remaining)}
                          </strong>
                          <small>
                            {remaining.gt(0) ? "Outstanding" : "Settled"}
                          </small>
                        </div>
                      </summary>
                      <div className="split-body">
                        <dl>
                          <div>
                            <dt>Original recoverable</dt>
                            <dd>{money(s.recoverable)}</dd>
                          </div>
                          <div>
                            <dt>Repaid</dt>
                            <dd>{money(D(s.recoverable).minus(remaining))}</dd>
                          </div>
                        </dl>
                        {s.notes && <p>{s.notes}</p>}
                        <h3>Repayment history</h3>
                        {s.settlements.length ? (
                          <ul className="settlement-list">
                            {s.settlements.map((r) => (
                              <li key={r.id}>
                                <span>
                                  {dateLabel(r.date)}
                                  {r.notes && <small>{r.notes}</small>}
                                </span>
                                <strong className="positive">
                                  {money(r.amount)}
                                </strong>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="muted">No repayments recorded yet.</p>
                        )}
                        {remaining.gt(0) && (
                          <div className="heading-actions">
                            <EntityForm
                              entity="settlement"
                              label="Record repayment"
                              initial={{ splitId: s.id }}
                            />
                            <EntityForm
                              entity="settlement"
                              label="Settle in full"
                              variant="outline"
                              initial={{
                                splitId: s.id,
                                amount: remaining.toFixed(2),
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </details>
                  );
                })}
              </div>
            </Panel>
          );
        })
      ) : (
        <Panel title="Shared expenses">
          <Empty
            title={
              friends.length ? "No matching splits" : "Keep friendships simple"
            }
            description="Record what you paid and the amount owed to you. Track partial repayments without losing the original details."
          >
            <EntityForm
              entity="split"
              label="Record your first split"
              {...options}
            />
          </Empty>
        </Panel>
      )}
      <p className="footnote">
        Splits track money owed to you. They do not create ledger entries.
        Record the full expense and any repayment income in Transactions to keep
        cash balances accurate. Outstanding receivables are included in net
        worth.
      </p>
    </>
  );
}
