"use client";
import { useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, LoaderCircle } from "lucide-react";
import { Dialog, DialogTrigger, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { paymentMethods, type Entity } from "@/lib/validations";
import { today, nowLocal } from "@/lib/formatters";
export type Option = {
  id: string;
  name: string;
  type?: string;
  archived?: boolean;
};
type Field = {
  name: string;
  label: string;
  type?: string;
  options?: string[] | Option[];
  value?: string | boolean;
  optional?: boolean;
  wide?: boolean;
  help?: string;
};
export type FormProps = {
  entity: Entity;
  label?: string;
  initial?: Record<string, unknown>;
  accounts?: Option[];
  categories?: Option[];
  variant?: "default" | "outline" | "ghost";
  title?: string;
  small?: boolean;
};
export function EntityForm({
  entity,
  label,
  initial = {},
  accounts = [],
  categories = [],
  variant = "default",
  title,
  small = false,
}: FormProps) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={small ? "sm" : "default"}>
          {!initial.id && <Plus size={16} />} {label || "Add " + entity}
        </Button>
      </DialogTrigger>
      <DialogContent title={title || label || "Add " + entity}>
        <Form
          entity={entity}
          initial={initial}
          accounts={accounts}
          categories={categories}
          onDone={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
function Form({
  entity,
  initial,
  accounts,
  categories,
  onDone,
}: {
  entity: Entity;
  initial: Record<string, unknown>;
  accounts: Option[];
  categories: Option[];
  onDone: () => void;
}) {
  const router = useRouter(),
    lock = useRef(false);
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    control,
    formState: { isSubmitting },
  } = useForm<Record<string, unknown>>({
    defaultValues: {
      type: entity === "account" ? "Bank" : "Expense",
      currency: "INR",
      openingBalance: "0",
      accountId: accounts.find((a) => !a.archived)?.id || "",
      date: entity === "transaction" ? nowLocal() : today(),
      purchaseDate: today(),
      startDate: today(),
      frequency: "Quarterly",
      status: "Active",
      paymentMethod: "Other",
      consumption: true,
      archived: false,
      ...initial,
    },
  });
  const type = useWatch({ control, name: "type" }) as string;
  const accountId = useWatch({ control, name: "accountId" });
  const fields: Field[] =
    entity === "account"
      ? [
          {
            name: "name",
            label: "Account name",
            help: "For example, your bank name or Cash wallet",
          },
          {
            name: "type",
            label: "Account type",
            options: ["Bank", "Cash", "Investment", "External"],
          },
          { name: "openingBalance", label: "Opening balance", type: "number" },
          { name: "currency", label: "Currency", options: ["INR"] },
        ]
      : entity === "category"
        ? [
            { name: "name", label: "Category name" },
            { name: "type", label: "Type", options: ["Expense", "Income"] },
            {
              name: "budget",
              label: "Monthly budget",
              type: "number",
              optional: true,
            },
            { name: "description", label: "Description", optional: true },
          ]
        : entity === "transaction"
          ? [
              { name: "amount", label: "Amount", type: "number" },
              {
                name: "type",
                label: "Transaction type",
                options: ["Expense", "Income", "Transfer", "Investment"],
              },
              { name: "description", label: "Description", wide: true },
              { name: "date", label: "Date & time", type: "datetime-local" },
              {
                name: "accountId",
                label: type === "Income" ? "Receiving account" : "From account",
                options: accounts,
              },
              ...(type === "Transfer"
                ? [
                    {
                      name: "destinationId",
                      label: "To account",
                      options: accounts.filter((a) => a.id !== accountId),
                    },
                  ]
                : []),
              ...(["Expense", "Income"].includes(type)
                ? [
                    {
                      name: "categoryId",
                      label: "Category",
                      options: categories.filter((c) => c.type === type),
                    },
                  ]
                : []),
              {
                name: "paymentMethod",
                label: "Payment method",
                options: [...paymentMethods],
              },
              ...(type === "Expense"
                ? [
                    {
                      name: "consumption",
                      label: "Count as consumption",
                      type: "checkbox",
                      wide: true,
                    },
                  ]
                : []),
              {
                name: "notes",
                label: "Notes",
                type: "textarea",
                optional: true,
                wide: true,
              },
            ]
          : entity === "stock"
            ? [
                { name: "ticker", label: "Ticker" },
                { name: "companyName", label: "Company name" },
                { name: "shares", label: "Number of shares", type: "number" },
                {
                  name: "averagePrice",
                  label: "Average purchase price",
                  type: "number",
                },
                {
                  name: "currentPrice",
                  label: "Current price · manual",
                  type: "number",
                },
                { name: "purchaseDate", label: "Purchase date", type: "date" },
                {
                  name: "accountId",
                  label: "Linked account (reference only)",
                  options: accounts,
                  optional: true,
                },
              ]
            : entity === "deposit"
              ? [
                  { name: "bankName", label: "Bank name" },
                  { name: "principal", label: "Principal", type: "number" },
                  {
                    name: "annualRate",
                    label: "Annual interest rate (%)",
                    type: "number",
                  },
                  {
                    name: "frequency",
                    label: "Compounding",
                    options: ["Annual", "Quarterly", "Monthly"],
                  },
                  { name: "startDate", label: "Start date", type: "date" },
                  {
                    name: "maturityDate",
                    label: "Maturity date",
                    type: "date",
                  },
                  {
                    name: "accountId",
                    label: "Linked account (reference only)",
                    options: accounts,
                    optional: true,
                  },
                  {
                    name: "status",
                    label: "Status",
                    options: ["Active", "Archived", "Redeemed"],
                  },
                  {
                    name: "notes",
                    label: "Notes",
                    type: "textarea",
                    optional: true,
                    wide: true,
                  },
                ]
              : entity === "split"
                ? [
                    { name: "friendName", label: "Friend name" },
                    { name: "purpose", label: "Purpose" },
                    {
                      name: "totalAmount",
                      label: "Total expense",
                      type: "number",
                    },
                    {
                      name: "recoverable",
                      label: "Amount owed to you",
                      type: "number",
                    },
                    {
                      name: "accountId",
                      label: "Paid from",
                      options: accounts,
                    },
                    { name: "date", label: "Expense date", type: "date" },
                    {
                      name: "notes",
                      label: "Notes",
                      type: "textarea",
                      optional: true,
                      wide: true,
                    },
                  ]
                : entity === "settlement"
                  ? [
                      {
                        name: "amount",
                        label: "Repayment amount",
                        type: "number",
                      },
                      { name: "date", label: "Repayment date", type: "date" },
                      {
                        name: "notes",
                        label: "Notes",
                        optional: true,
                        wide: true,
                      },
                    ]
                  : entity === "bulk"
                    ? [
                        { name: "date", label: "Repayment date", type: "date" },
                        {
                          name: "notes",
                          label: "Notes",
                          optional: true,
                          wide: true,
                        },
                      ]
                    : [
                        {
                          name: "reportingPeriod",
                          label: "Overview reporting period",
                          options: ["month", "year"],
                        },
                        {
                          name: "defaultPayment",
                          label: "Default payment method",
                          options: [...paymentMethods],
                        },
                      ];
  async function submit(data: Record<string, unknown>) {
    if (lock.current) return;
    lock.current = true;
    setError("");
    try {
      const res = await fetch("/api/" + entity, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, id: initial.id }),
      });
      const result = await res.json();
      if (!res.ok) throw Error(result.error);
      toast.success(initial.id ? "Changes saved" : "Saved successfully");
      router.refresh();
      onDone();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not save. Please try again.",
      );
    } finally {
      lock.current = false;
    }
  }
  return (
    <form
      onSubmit={(event) => void handleSubmit(submit)(event)}
      className="entity-form"
    >
      <div className="form-grid">
        {fields.map((f, i) => (
          <label
            key={f.name}
            className={
              (f.wide ? "wide " : "") +
              (f.type === "checkbox" ? "check-field" : "")
            }
          >
            {f.type !== "checkbox" && (
              <span>
                {f.label}
                {f.optional && <small>Optional</small>}
              </span>
            )}
            {f.options ? (
              <select {...register(f.name, { required: !f.optional })}>
                <option value="">Select {f.label.toLowerCase()}</option>
                {f.options.map((o) =>
                  typeof o === "string" ? (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ) : (
                    <option
                      key={o.id}
                      value={o.id}
                      disabled={o.archived && initial[f.name] !== o.id}
                    >
                      {o.name}
                      {o.archived ? " (archived)" : ""}
                    </option>
                  ),
                )}
              </select>
            ) : f.type === "textarea" ? (
              <textarea {...register(f.name)} rows={2} />
            ) : (
              <input
                {...register(f.name, {
                  required: !f.optional && f.type !== "checkbox",
                })}
                type={f.type || "text"}
                step={f.type === "number" ? "any" : undefined}
                inputMode={f.type === "number" ? "decimal" : undefined}
                autoFocus={i === 0}
              />
            )}
            {f.type === "checkbox" && <span>{f.label}</span>}
            {f.help && <small className="field-help">{f.help}</small>}
          </label>
        ))}
        {!!initial.id && ["account", "category", "stock"].includes(entity) && (
          <label className="check-field wide">
            <input type="checkbox" {...register("archived")} />
            <span>Archive this {entity}</span>
          </label>
        )}
      </div>
      {["stock", "deposit"].includes(entity) && (
        <p className="form-note">
          Record the funding separately as an investment contribution. A linked
          account is a reference and does not move money.
        </p>
      )}
      {entity === "split" && (
        <p className="form-note">
          Splits track receivables. Record the original expense and repayments
          separately in the ledger; repayments are non-consumption credits.
        </p>
      )}
      {entity === "bulk" && (
        <p className="form-note">
          This records full repayment for all this friend’s outstanding splits,
          preserving every original expense.
        </p>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="form-footer">
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <LoaderCircle size={16} className="spin" />}Save{" "}
          {entity === "transaction"
            ? "transaction"
            : entity === "bulk"
              ? "settlements"
              : entity === "preference"
                ? "preferences"
                : entity}
        </Button>
      </div>
    </form>
  );
}
export function DeleteButton({ entity, id }: { entity: string; id: string }) {
  const router = useRouter(),
    [busy, setBusy] = useState(false);
  async function remove() {
    if (!confirm("Delete this record? This cannot be undone.")) return;
    setBusy(true);
    try {
      const r = await fetch("/api/" + entity, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!r.ok) throw Error("Could not delete record");
      toast.success("Record deleted");
      router.refresh();
    } catch (e) {
      toast.error(String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Button size="sm" variant="ghost" disabled={busy} onClick={remove}>
      Delete
    </Button>
  );
}
