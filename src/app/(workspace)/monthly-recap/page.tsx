import { requireUser } from "@/lib/session";
import Link from "next/link";
import { db } from "@/lib/db";
import { D, monthly, monthKey, sum, isConsumption } from "@/lib/finance";
import { today, money } from "@/lib/formatters";
import {
  PageHeader,
  Panel,
  Metric,
  Empty,
  Progress,
  TransactionRows,
} from "@/components/data-ui";
import { ReportChart } from "@/components/charts/report-charts";
import { Button } from "@/components/ui/button";
export const dynamic = "force-dynamic";
export default async function MonthlyRecap({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { id: userId } = await requireUser();
  const q = await searchParams;
  const current = monthKey(today() + "T00:00:00+05:30"),
    month =
      q.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(q.month) ? q.month : current;
  const date = new Date(month + "-15T12:00:00Z");
  const prev = new Date(date);
  prev.setUTCMonth(prev.getUTCMonth() - 1);
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + 1);
  const key = (d: Date) => d.toISOString().slice(0, 7);
  const [entries, categories] = await Promise.all([
    db.transaction.findMany({
      where: { userId },
      include: { account: true, category: true, destination: true },
      orderBy: { date: "desc" },
    }),
    db.category.findMany({
      where: { userId, type: "Expense" },
      orderBy: { name: "asc" },
    }),
  ]);
  const report = monthly(entries, month),
    previous = monthly(entries, key(prev));
  const groups = categories
    .map((c) => {
      const rows = report.consumption.filter((t) => t.categoryId === c.id),
        spent = sum(rows.map((t) => t.amount));
      return {
        c,
        rows,
        spent,
        percent: report.spending.isZero()
          ? D(0)
          : spent.div(report.spending).mul(100),
        util:
          c.budget && D(c.budget).gt(0) ? spent.div(c.budget).mul(100) : null,
      };
    })
    .filter((g) => g.rows.length || g.c.budget !== null);
  const byPayment = Array.from(
    new Set(report.consumption.map((t) => t.paymentMethod)),
  ).map((name) => ({
    name,
    value: sum(
      report.consumption
        .filter((t) => t.paymentMethod === name)
        .map((t) => t.amount),
    ).toNumber(),
  }));
  const trend = Array.from(
    new Set(entries.filter(isConsumption).map((t) => monthKey(t.date))),
  )
    .sort()
    .filter((m) => m <= month)
    .slice(-6)
    .map((m) => ({ name: m, value: monthly(entries, m).spending.toNumber() }));
  return (
    <>
      <PageHeader
        eyebrow="PAUSE. REFLECT. PLAN."
        title="Monthly Recap"
        description="Understand the month behind you. Make room for what’s next."
      >
        <div className="month-picker">
          <Button variant="ghost" asChild>
            <Link href={"?month=" + key(prev)} aria-label="Previous month">
              ←
            </Link>
          </Button>
          <span>
            {date.toLocaleDateString("en-IN", {
              month: "long",
              year: "numeric",
              timeZone: "UTC",
            })}
          </span>
          <Button variant="ghost" asChild>
            <Link href={"?month=" + key(next)} aria-label="Next month">
              →
            </Link>
          </Button>
        </div>
      </PageHeader>
      <form className="month-jump">
        <label>
          Jump to month{" "}
          <input
            aria-label="Reporting month"
            name="month"
            type="month"
            defaultValue={month}
          />
        </label>
        <Button variant="outline" size="sm">
          Go
        </Button>
      </form>
      {!report.rows.length ? (
        <Panel title="Monthly activity">
          <Empty
            title="Nothing recorded this month"
            description="Choose another month or add a transaction to start building your recap."
          >
            <Button asChild>
              <Link href="/transactions">Open transactions</Link>
            </Button>
          </Empty>
        </Panel>
      ) : (
        <>
          <div className="metrics">
            <Metric
              label="Consumption"
              value={report.spending}
              detail={
                previous.spending.gt(0)
                  ? `${report.spending.minus(previous.spending).div(previous.spending).mul(100).toFixed(1)}% vs previous month`
                  : "No previous-month comparison"
              }
            />
            <Metric
              label="Income received"
              value={report.income}
              detail={`${report.rows.length} total transactions`}
              positive
            />
            <Metric
              label="Investment contributions"
              value={report.investments}
              detail="Excluded from consumption"
            />
            <Metric
              label="Total account outflow"
              value={report.outflow}
              detail={
                "Includes " + money(report.transfers) + " internal transfers"
              }
            />
          </div>
          <div className="two-columns">
            <Panel
              title="Consumption by category"
              subtitle="Pure-consumption expenses only"
            >
              {report.spending.gt(0) ? (
                <ReportChart
                  type="donut"
                  data={groups
                    .filter((g) => g.spent.gt(0))
                    .map((g) => ({
                      name: g.c.name,
                      value: g.spent.toNumber(),
                    }))}
                />
              ) : (
                <Empty
                  title="No consumption"
                  description="Transfers and investments are excluded."
                />
              )}
            </Panel>
            <Panel
              title="How you paid"
              subtitle="Consumption by payment method"
            >
              {byPayment.length ? (
                <ReportChart data={byPayment} />
              ) : (
                <Empty
                  title="No payment breakdown"
                  description="Record a consumption expense to see payment methods."
                />
              )}
            </Panel>
          </div>
          <Panel
            title="Category budgets"
            subtitle="See what you spent and what remains"
          >
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th className="numeric">Spending</th>
                    <th className="numeric">Share</th>
                    <th className="numeric">Count</th>
                    <th className="numeric">Budget</th>
                    <th>Utilization</th>
                    <th className="numeric">Remaining</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((g) => (
                    <tr key={g.c.id}>
                      <td>{g.c.name}</td>
                      <td className="numeric">{money(g.spent)}</td>
                      <td className="numeric">{g.percent.toFixed(1)}%</td>
                      <td className="numeric">{g.rows.length}</td>
                      <td className="numeric">
                        {g.c.budget === null ? "—" : money(g.c.budget)}
                      </td>
                      <td>
                        {g.util !== null ? (
                          <>
                            <Progress value={g.util} />
                            <small>{g.util.toFixed(0)}%</small>
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="numeric">
                        {g.c.budget === null
                          ? "—"
                          : money(D(g.c.budget).minus(g.spent))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
          <Panel
            title="Largest consumption expenses"
            subtitle="Your top five expenses this month"
          >
            {report.consumption.length ? (
              <TransactionRows
                rows={[...report.consumption]
                  .sort((a, b) => D(b.amount).comparedTo(a.amount))
                  .slice(0, 5)}
              />
            ) : (
              <Empty
                title="No consumption expenses"
                description="Your largest expenses will appear here."
              />
            )}
          </Panel>
          {trend.length > 1 && (
            <Panel
              title="Monthly spending trend"
              subtitle="Consumption only · up to six recorded months"
            >
              <ReportChart type="trend" data={trend} />
            </Panel>
          )}
        </>
      )}
    </>
  );
}
