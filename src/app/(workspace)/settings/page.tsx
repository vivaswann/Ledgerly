import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { PageHeader, Panel } from "@/components/data-ui";
import { ThemeSettings } from "@/components/settings";
import { EntityForm } from "@/components/forms/entity-form";
import { Button } from "@/components/ui/button";
import Link from "next/link";
export const dynamic = "force-dynamic";
export default async function Settings() {
  const { id: userId } = await requireUser();
  const prefs = await db.preference.findUnique({ where: { userId } });
  return (
    <>
      <PageHeader
        eyebrow="MAKE YOURSELF AT HOME"
        title="Settings"
        description="A few thoughtful choices, just for you."
      />
      <Panel title="Appearance" subtitle="Choose a theme that feels right.">
        <div className="settings-content">
          <ThemeSettings />
        </div>
      </Panel>
      <Panel title="Preferences" subtitle="Your everyday defaults">
        <div className="settings-content">
          <dl>
            <div>
              <dt>Currency & formatting</dt>
              <dd>Indian rupee · ₹1,25,000.50 · en-IN</dd>
            </div>
            <div>
              <dt>Reporting timezone</dt>
              <dd>Asia/Kolkata</dd>
            </div>
            <div>
              <dt>Overview reporting period</dt>
              <dd>
                {prefs?.reportingPeriod === "year"
                  ? "Current year"
                  : "Current month"}
              </dd>
            </div>
            <div>
              <dt>Default payment method</dt>
              <dd>{prefs?.defaultPayment || "Other"}</dd>
            </div>
          </dl>
          <EntityForm
            entity="preference"
            label="Edit preferences"
            variant="outline"
            initial={{
              reportingPeriod: prefs?.reportingPeriod || "month",
              defaultPayment: prefs?.defaultPayment || "Other",
            }}
          />
        </div>
      </Panel>
      <Panel title="Your data" subtitle="Private to your signed-in account">
        <div className="settings-content">
          <h3>Export your ledger</h3>
          <p>
            Download all transactions as CSV. To export a selection, use the
            filters in{" "}
            <Link className="text-link" href="/transactions">
              Transactions
            </Link>
            .
          </p>
          <Button variant="outline" asChild>
            <a href="/api/export" download>
              Export all transactions
            </a>
          </Button>
          <hr />
          <h3>Keep a copy of your records</h3>
          <p>
            CSV exports include only transactions belonging to your account.
            Keep exports in a secure place.
          </p>
        </div>
      </Panel>
      <Panel
        title="How your numbers work"
        subtitle="An explicit accounting policy"
      >
        <div className="settings-content policy">
          <p>
            <strong>Account balances.</strong> Opening balance plus income and
            incoming transfers, minus expenses, outgoing transfers, and
            investment contributions. A transfer is one record and has no effect
            on consolidated wealth.
          </p>
          <p>
            <strong>Consumption.</strong> Only expenses marked as consumption
            count toward spending and budget reports. Transfers and investment
            contributions are excluded.
          </p>
          <p>
            <strong>Investments.</strong> Accounts, including investment
            accounts, hold uninvested cash. Holdings and fixed deposits are
            valued separately. When funding an investment, record one Investment
            transaction from the paying account, then add the corresponding
            asset. Linked accounts provide context only. Adding, editing,
            archiving, or deleting an asset never changes the ledger
            automatically. When selling or redeeming, remove the holding or
            deposit value and record the proceeds as income in the ledger.
          </p>
          <p>
            <strong>Archived assets.</strong> Archiving keeps the value and
            history in net worth. Set a deposit’s status to Redeemed after
            recording redemption to exclude it from net worth while preserving
            its details.
          </p>
          <p>
            <strong>Receivables.</strong> Splits add only the outstanding
            recoverable amount to net worth. Record the full shared expense in
            the ledger. Repayments reduce receivables; record money received
            separately as income to update cash. Consumption remains the
            original eligible expense; for personal-only consumption, split the
            ledger expense into a consumption portion and a non-consumption
            portion. Income reports include repayment credits.
          </p>
          <p>
            <strong>Currency & liabilities.</strong> This version uses INR
            throughout to avoid combining currencies without exchange rates.
            Negative account balances represent liabilities and reduce net
            worth. There is no separate loan schedule.
          </p>
          <p>
            <strong>FD estimates.</strong> Actual elapsed days / 365, capped at
            maturity, with nominal annual interest compounded at the selected
            frequency. Decimal arithmetic rounds the final estimate to paise. No
            tax, fees, or early-withdrawal penalty is assumed. These are
            estimates, not bank-confirmed amounts.
          </p>
        </div>
      </Panel>
    </>
  );
}
