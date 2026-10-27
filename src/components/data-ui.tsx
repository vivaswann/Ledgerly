import Link from "next/link";
import { ArrowUpRight, Inbox } from "lucide-react";
import { money, dateLabel } from "@/lib/formatters";
import { D } from "@/lib/finance";
import type { Money } from "@/lib/finance";
export function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="heading-actions">{children}</div>
    </div>
  );
}
export function Panel({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={"panel " + className}>
      <div className="panel-heading">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
export function Empty({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Inbox size={25} strokeWidth={1.4} />
      </div>
      <h2>{title}</h2>
      <p>{description}</p>
      {children}
    </div>
  );
}
export function Metric({
  label,
  value,
  detail,
  positive = false,
}: {
  label: string;
  value: Money;
  detail: string;
  positive?: boolean;
}) {
  return (
    <div className="metric">
      <p>{label}</p>
      <strong className={positive ? "positive" : ""}>{money(value)}</strong>
      <small>{detail}</small>
    </div>
  );
}
type Row = {
  id: string;
  date: Date;
  description: string;
  type: string;
  amount: Money;
  account: { name: string };
  category?: { name: string } | null;
  destination?: { name: string } | null;
};
export function TransactionRows({
  rows,
  actions,
}: {
  rows: Row[];
  actions?: (id: string) => React.ReactNode;
}) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th>Date</th>
            <th>Account</th>
            <th>Category</th>
            <th className="numeric">Amount</th>
            {actions && <th className="numeric">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.id}>
              <td>
                <div className="transaction-name">
                  <span
                    className={"transaction-symbol " + t.type.toLowerCase()}
                  >
                    <ArrowUpRight size={17} />
                  </span>
                  <span>
                    <strong>{t.description}</strong>
                    <small>{t.type}</small>
                  </span>
                </div>
              </td>
              <td className="muted nowrap">{dateLabel(t.date)}</td>
              <td>
                {t.account.name}
                {t.destination && (
                  <small className="block muted">→ {t.destination.name}</small>
                )}
              </td>
              <td className="muted">{t.category?.name || "—"}</td>
              <td
                className={
                  "numeric nowrap " + (t.type === "Income" ? "positive" : "")
                }
              >
                {t.type === "Income" ? "+" : t.type === "Transfer" ? "" : "−"}
                {money(t.amount)}
              </td>
              {actions && (
                <td>
                  <div className="row-actions">{actions(t.id)}</div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function ViewLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link className="text-link" href={href}>
      {children}
      <ArrowUpRight size={14} />
    </Link>
  );
}
export function Progress({ value }: { value: Money }) {
  return (
    <div className="progress">
      <span
        style={{ width: Math.min(100, Math.max(0, D(value).toNumber())) + "%" }}
      />
    </div>
  );
}
