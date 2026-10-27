import { requireUser } from "@/lib/session";
import Link from "next/link";
import {
  ArrowRight,
  Wallet,
  ArrowLeftRight,
  TrendingUp,
  ShieldCheck,
  Check,
} from "lucide-react";
import { db } from "@/lib/db";
import { getOptions } from "@/lib/services/queries";
import {
  balance,
  sum,
  portfolio,
  depositValue,
  outstanding,
  netWorth,
  monthly,
  monthKey,
  isConsumption,
} from "@/lib/finance";
import { money, today, nowLocal } from "@/lib/formatters";
import { EntityForm } from "@/components/forms/entity-form";
import {
  PageHeader,
  Panel,
  Metric,
  Empty,
  TransactionRows,
  ViewLink,
} from "@/components/data-ui";
import { ReportChart } from "@/components/charts/report-charts";
export const dynamic = "force-dynamic";
export default async function Overview() {
  const { id: userId } = await requireUser();
  const { accounts, categories, prefs } = await getOptions(userId);
  const active = accounts.filter((a) => !a.archived);
  const options = {
    accounts: accounts.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      archived: a.archived,
    })),
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      archived: c.archived,
    })),
  };
  if (!accounts.length)
    return (
      <>
        <PageHeader
          eyebrow="YOUR PERSONAL WORKSPACE"
          title="A little clarity. A lot of possibility."
          description="One considered place for your everyday money and long-term wealth."
        />
        <section className="onboarding panel">
          <div className="onboarding-copy">
            <span className="intro-label">
              <span className="status-dot" /> A fresh start
            </span>
            <div className="onboarding-mark">
              <Wallet size={34} strokeWidth={1.3} />
            </div>
            <h2>Set up your finances</h2>
            <p>
              Start with an account you use every day.
              <br />
              Your bank, your cash wallet — whatever works for you.
            </p>
            <EntityForm entity="account" label="Create your first account" />
            <div className="privacy-note">
              <ShieldCheck size={14} />
              Your finances are private to your account.
            </div>
          </div>
          <div className="onboarding-steps">
            <p className="eyebrow">MAKE ROOM FOR A CLEARER PICTURE</p>
            {[
              [
                Wallet,
                "Start with your accounts",
                "Give your money a home. Set the opening balance yourself.",
              ],
              [
                ArrowLeftRight,
                "Make everyday tracking effortless",
                "Log an expense, receive income, or move money between accounts.",
              ],
              [
                TrendingUp,
                "See the whole picture",
                "Follow your spending, investments, and money owed to you.",
              ],
            ].map(([, title, copy], i) => (
              <div className="setup-step" key={String(title)}>
                <span className="step-number">0{i + 1}</span>
                <div>
                  <h3>{String(title)}</h3>
                  <p>{String(copy)}</p>
                </div>
              </div>
            ))}
            <div className="setup-check">
              <Check size={14} /> No bank connection required <span>·</span> No
              demo data
            </div>
          </div>
        </section>
        <div className="onboarding-bottom">
          <span>Built for your everyday decisions.</span>
          <Link href="/categories">
            Explore your categories <ArrowRight size={15} />
          </Link>
        </div>
      </>
    );
  const [entries, stocks, deposits, splits] = await Promise.all([
    db.transaction.findMany({
      where: { userId },
      include: { account: true, category: true, destination: true },
      orderBy: { date: "desc" },
    }),
    db.stockHolding.findMany({ where: { userId } }),
    db.fixedDeposit.findMany({ where: { userId } }),
    db.splitTracker.findMany({
      where: { userId },
      include: { settlements: true },
    }),
  ]);
  const balances = accounts.map((a) => ({ ...a, value: balance(a, entries) })),
    cash = sum(balances.map((a) => a.value));
  const p = portfolio(stocks),
    fd = sum(
      deposits
        .filter((f) => f.status !== "Redeemed")
        .map((f) => depositValue(f, new Date())),
    ),
    receivables = sum(
      splits.map((s) => outstanding(s.recoverable, s.settlements)),
    );
  const month = monthKey(today() + "T00:00:00+05:30"),
    report = monthly(entries, month);
  const periodEntries =
    prefs?.reportingPeriod === "year"
      ? entries.filter((t) => monthKey(t.date).startsWith(month.slice(0, 4)))
      : report.rows;
  const trend = Array.from(
    new Set(entries.filter(isConsumption).map((t) => monthKey(t.date))),
  )
    .sort()
    .slice(-6)
    .map((m) => ({ name: m, value: monthly(entries, m).spending.toNumber() }));
  const breakdown = categories
    .map((c) => ({
      name: c.name,
      value: sum(
        report.consumption
          .filter((t) => t.categoryId === c.id)
          .map((t) => t.amount),
      ).toNumber(),
    }))
    .filter((d) => d.value > 0);
  return (
    <>
      <PageHeader
        eyebrow="THE BIG PICTURE"
        title="Overview"
        description="Your money, brought into focus."
      >
        <EntityForm
          entity="transaction"
          label="Add expense"
          {...options}
          initial={{
            type: "Expense",
            paymentMethod: prefs?.defaultPayment || "Other",
            date: nowLocal(),
          }}
        />
      </PageHeader>
      <div className="metrics">
        <Metric
          label="Net worth"
          value={netWorth(cash, p.value, fd, receivables)}
          detail="Accounts + investments + receivables"
        />
        <Metric
          label={
            prefs?.reportingPeriod === "year"
              ? "This year’s consumption"
              : "This month’s consumption"
          }
          value={sum(periodEntries.filter(isConsumption).map((t) => t.amount))}
          detail="Pure-consumption expenses"
        />
        <Metric
          label="Bank & cash"
          value={sum(
            balances
              .filter((a) => ["Bank", "Cash"].includes(a.type))
              .map((a) => a.value),
          )}
          detail="Across your accounts"
        />
        <Metric
          label="Owed to you"
          value={receivables}
          detail="Outstanding friend repayments"
          positive
        />
      </div>
      <div className="quick-actions">
        <span>QUICK ADD</span>
        <EntityForm
          entity="transaction"
          label="Income"
          variant="ghost"
          {...options}
          initial={{
            type: "Income",
            paymentMethod: prefs?.defaultPayment,
            date: nowLocal(),
          }}
        />
        <EntityForm
          entity="transaction"
          label="Transfer"
          variant="ghost"
          {...options}
          initial={{ type: "Transfer", date: nowLocal() }}
        />
        <EntityForm
          entity="transaction"
          label="Investment"
          variant="ghost"
          {...options}
          initial={{ type: "Investment", date: nowLocal() }}
        />
        <EntityForm entity="split" label="Split" variant="ghost" {...options} />
      </div>
      <div className="content-grid">
        <Panel
          title="Recent transactions"
          subtitle="A running record of your everyday money"
          action={<ViewLink href="/transactions">View all</ViewLink>}
        >
          {entries.length ? (
            <TransactionRows rows={entries.slice(0, 6)} />
          ) : (
            <Empty
              title="Your ledger starts here"
              description="Add your first expense or income. Your balances and reports will update automatically."
            >
              <EntityForm
                entity="transaction"
                label="Record a transaction"
                {...options}
                initial={{
                  date: nowLocal(),
                  paymentMethod: prefs?.defaultPayment,
                }}
              />
            </Empty>
          )}
        </Panel>
        <Panel
          title="Your accounts"
          action={<ViewLink href="/accounts">Manage</ViewLink>}
        >
          <div className="account-list">
            {balances.map((a) => (
              <Link
                href={"/transactions?account=" + a.id}
                className="account-item"
                key={a.id}
              >
                <span className="account-icon">
                  <Wallet size={18} />
                </span>
                <span>
                  <strong>{a.name}</strong>
                  <small>
                    {a.type}
                    {a.archived ? " · Archived" : ""}
                  </small>
                </span>
                <strong>{money(a.value)}</strong>
              </Link>
            ))}
          </div>
          {!active.length && (
            <p className="panel-note">
              All accounts are archived. Add an account to record new activity.
            </p>
          )}
        </Panel>
      </div>
      {entries.length > 0 && (
        <div className="two-columns">
          <Panel
            title="Consumption over time"
            subtitle="Monthly spending · INR"
          >
            {trend.length > 1 ? (
              <ReportChart data={trend} type="trend" />
            ) : (
              <Empty
                title="A little more history"
                description="Your spending trend appears after two months of consumption records."
              />
            )}
          </Panel>
          <Panel
            title="Where your money goes"
            subtitle="This month’s consumption"
          >
            {breakdown.length ? (
              <>
                <ReportChart data={breakdown} type="donut" />
                <div className="legend">
                  {breakdown.slice(0, 4).map((d) => (
                    <span key={d.name}>
                      {d.name}
                      <strong>{money(d.value)}</strong>
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <Empty
                title="No consumption this month"
                description="Eligible expenses will appear here."
              />
            )}
          </Panel>
        </div>
      )}
      {(stocks.length > 0 || deposits.length > 0) && (
        <Panel
          title="Your wealth"
          action={<ViewLink href="/investments">View investments</ViewLink>}
        >
          <div className="metrics inset">
            <Metric
              label="Stocks · manual prices"
              value={p.value}
              detail={"Unrealized return " + p.percent.toFixed(2) + "%"}
            />
            <Metric
              label="Fixed deposits"
              value={fd}
              detail="Estimated accrued value"
            />
          </div>
        </Panel>
      )}
      <p className="footnote">
        Net worth includes all account balances, holdings, deposits, and
        outstanding receivables. <Link href="/settings">Accounting policy</Link>
      </p>
    </>
  );
}
