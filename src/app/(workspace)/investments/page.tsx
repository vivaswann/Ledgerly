import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { portfolio, stock, depositValue, D, sum } from "@/lib/finance";
import { money, dateLabel } from "@/lib/formatters";
import { EntityForm, DeleteButton } from "@/components/forms/entity-form";
import {
  PageHeader,
  Panel,
  Metric,
  Empty,
  Progress,
} from "@/components/data-ui";
export const dynamic = "force-dynamic";
export default async function Investments() {
  const { id: userId } = await requireUser();
  const [stocks, deposits, accounts] = await Promise.all([
    db.stockHolding.findMany({ where: { userId }, orderBy: { ticker: "asc" } }),
    db.fixedDeposit.findMany({
      where: { userId },
      orderBy: { maturityDate: "asc" },
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
  const p = portfolio(stocks);
  return (
    <>
      <PageHeader
        eyebrow="THINK LONGER TERM"
        title="Investments"
        description="A considered view of the wealth you’re building."
      >
        <EntityForm
          entity="deposit"
          label="Add fixed deposit"
          variant="outline"
          {...options}
        />
        <EntityForm entity="stock" label="Add holding" {...options} />
      </PageHeader>
      {(stocks.length > 0 || deposits.length > 0) && (
        <div className="metrics">
          <Metric
            label="Stock market value"
            value={p.value}
            detail="Manually entered prices"
          />
          <Metric
            label="Invested capital"
            value={p.invested}
            detail="Shares × average purchase price"
          />
          <Metric
            label="Unrealized profit / loss"
            value={p.profit}
            detail={p.percent.toFixed(2) + "% aggregate return"}
            positive={p.profit.gte(0)}
          />
          <Metric
            label="Fixed deposits"
            value={sum(
              deposits
                .filter((f) => f.status !== "Redeemed")
                .map((f) => depositValue(f, new Date())),
            )}
            detail="Estimated accrued value"
          />
        </div>
      )}
      <Panel
        title="Stock holdings"
        subtitle="Manual prices · update a holding to change its price"
      >
        {stocks.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Holding</th>
                  <th className="numeric">Shares</th>
                  <th className="numeric">Avg. price</th>
                  <th className="numeric">Current price</th>
                  <th className="numeric">Market value</th>
                  <th className="numeric">Return</th>
                  <th className="numeric">Actions</th>
                </tr>
              </thead>
              <tbody>
                {stocks.map((s) => {
                  const r = stock(s);
                  return (
                    <tr key={s.id}>
                      <td>
                        <strong>{s.ticker}</strong>
                        <small className="block muted">
                          {s.companyName}
                          {s.archived ? " · Archived" : ""}
                        </small>
                        <small className="block muted">
                          Updated {dateLabel(s.lastPriceUpdate)} ·{" "}
                          {s.priceSource}
                        </small>
                      </td>
                      <td className="numeric">{s.shares.toString()}</td>
                      <td className="numeric">{money(s.averagePrice)}</td>
                      <td className="numeric">{money(s.currentPrice)}</td>
                      <td className="numeric">{money(r.value)}</td>
                      <td
                        className={
                          "numeric " +
                          (r.profit.gte(0) ? "positive" : "negative")
                        }
                      >
                        {money(r.profit)}
                        <small className="block">{r.percent.toFixed(2)}%</small>
                      </td>
                      <td>
                        <div className="row-actions">
                          <EntityForm
                            entity="stock"
                            label="Edit / price"
                            small
                            variant="ghost"
                            {...options}
                            initial={{
                              ...s,
                              shares: s.shares.toString(),
                              averagePrice: s.averagePrice.toString(),
                              currentPrice: s.currentPrice.toString(),
                              purchaseDate: new Date(
                                s.purchaseDate.getTime() + 330 * 60000,
                              )
                                .toISOString()
                                .slice(0, 10),
                              accountId: s.accountId || "",
                            }}
                          />
                          <DeleteButton entity="stock" id={s.id} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="Room to grow"
            description="Add your first holding to track invested capital, value, and returns. Prices are entered by you."
          >
            <EntityForm
              entity="stock"
              label="Add your first holding"
              {...options}
            />
          </Empty>
        )}
      </Panel>
      <Panel
        title="Fixed deposits"
        subtitle="Estimated returns using your rate, dates, and compounding frequency"
      >
        {deposits.length ? (
          <div className="deposit-grid">
            {deposits.map((f) => {
              const value = depositValue(f),
                now = new Date(),
                matured = now >= f.maturityDate,
                days = Math.max(
                  0,
                  Math.ceil(
                    (f.maturityDate.getTime() - now.getTime()) / 86400000,
                  ),
                ),
                progress = D(now.getTime() - f.startDate.getTime())
                  .div(f.maturityDate.getTime() - f.startDate.getTime())
                  .mul(100);
              return (
                <article className="deposit-card" key={f.id}>
                  <div className="deposit-title">
                    <h3>{f.bankName}</h3>
                    <span className={"badge " + (matured ? "good" : "")}>
                      {f.status === "Redeemed"
                        ? "Redeemed"
                        : f.status === "Archived"
                          ? "Archived"
                          : matured
                            ? "Matured"
                            : "Active"}
                    </span>
                  </div>
                  <div className="deposit-value">
                    <span>Estimated maturity</span>
                    <strong>{money(value)}</strong>
                  </div>
                  <dl>
                    <div>
                      <dt>Principal</dt>
                      <dd>{money(f.principal)}</dd>
                    </div>
                    <div>
                      <dt>Interest rate</dt>
                      <dd>
                        {f.annualRate.toString()}% · {f.frequency}
                      </dd>
                    </div>
                    <div>
                      <dt>Estimated interest</dt>
                      <dd className="positive">
                        {money(value.minus(f.principal))}
                      </dd>
                    </div>
                    <div>
                      <dt>Start date</dt>
                      <dd>{dateLabel(f.startDate)}</dd>
                    </div>
                    <div>
                      <dt>Matures</dt>
                      <dd>{dateLabel(f.maturityDate)}</dd>
                    </div>
                  </dl>
                  <Progress value={progress} />
                  <p className="muted">
                    {matured
                      ? "Maturity date reached"
                      : days + " days remaining"}{" "}
                    ·{" "}
                    {Math.min(100, Math.max(0, progress.toNumber())).toFixed(0)}
                    %
                  </p>
                  {f.notes && <p className="muted">{f.notes}</p>}
                  <EntityForm
                    entity="deposit"
                    label="Edit deposit"
                    small
                    variant="outline"
                    {...options}
                    initial={{
                      ...f,
                      principal: f.principal.toString(),
                      annualRate: f.annualRate.toString(),
                      startDate: new Date(f.startDate.getTime() + 330 * 60000)
                        .toISOString()
                        .slice(0, 10),
                      maturityDate: new Date(
                        f.maturityDate.getTime() + 330 * 60000,
                      )
                        .toISOString()
                        .slice(0, 10),
                      accountId: f.accountId || "",
                      notes: f.notes || "",
                    }}
                  />
                </article>
              );
            })}
          </div>
        ) : (
          <Empty
            title="Let time do its work"
            description="Track a fixed deposit and see its estimated maturity amount."
          >
            <EntityForm
              entity="deposit"
              label="Add fixed deposit"
              {...options}
            />
          </Empty>
        )}
      </Panel>
      <p className="footnote">
        Estimates use actual elapsed days / 365 and nominal annual compounding,
        rounded to paise. Bank-confirmed values may differ. Archived assets
        remain in net worth until removed or their value is withdrawn. Linked
        accounts are references; record funding once as an investment
        contribution. No automatic cash movement occurs when an asset is added.
      </p>
    </>
  );
}
