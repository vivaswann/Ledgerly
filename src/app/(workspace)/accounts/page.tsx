import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { balance } from "@/lib/finance";
import { money, dateLabel } from "@/lib/formatters";
import { EntityForm } from "@/components/forms/entity-form";
import { PageHeader, Panel, Empty, ViewLink } from "@/components/data-ui";
import { Wallet } from "lucide-react";
export const dynamic = "force-dynamic";
export default async function Accounts() {
  const { id: userId } = await requireUser();
  const [accounts, entries] = await Promise.all([
    db.account.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    db.transaction.findMany({ where: { userId } }),
  ]);
  return (
    <>
      <PageHeader
        eyebrow="GIVE YOUR MONEY A HOME"
        title="Accounts"
        description="Your balances are calculated directly from the ledger."
      >
        <EntityForm entity="account" label="Add account" />
      </PageHeader>
      {accounts.length ? (
        <div className="account-grid">
          {accounts.map((a) => (
            <Panel
              key={a.id}
              title={a.name}
              subtitle={`${a.type} · ${a.currency}${a.archived ? " · Archived" : ""}`}
              action={
                <span className="account-icon">
                  <Wallet size={19} />
                </span>
              }
            >
              <div className="account-balance">
                <span>Current balance</span>
                <strong>{money(balance(a, entries))}</strong>
                <small>Opening balance {money(a.openingBalance)}</small>
              </div>
              <div className="account-card-footer">
                <ViewLink href={"/transactions?account=" + a.id}>
                  View history
                </ViewLink>
                <EntityForm
                  entity="account"
                  label="Edit account"
                  variant="ghost"
                  small
                  initial={{
                    ...a,
                    openingBalance: a.openingBalance.toFixed(2),
                  }}
                />
              </div>
              <p className="card-meta">Created {dateLabel(a.createdAt)}</p>
            </Panel>
          ))}
        </div>
      ) : (
        <Panel title="Your accounts">
          <Empty
            title="Start with an account"
            description="Add your bank, cash wallet, investment cash, or another asset account. You choose the opening balance."
          >
            <EntityForm entity="account" label="Create your first account" />
          </Empty>
        </Panel>
      )}
      <p className="footnote">
        Archiving preserves the account’s balance and transaction history.
        Investment accounts track uninvested cash; record purchases as
        investment contributions.
      </p>
    </>
  );
}
