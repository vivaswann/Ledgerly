import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { money } from "@/lib/formatters";
import { EntityForm } from "@/components/forms/entity-form";
import { PageHeader, Panel } from "@/components/data-ui";
export const dynamic = "force-dynamic";
export default async function Categories() {
  const { id: userId } = await requireUser();
  const categories = await db.category.findMany({
    where: { userId },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });
  return (
    <>
      <PageHeader
        eyebrow="A PLACE FOR EVERY EXPENSE"
        title="Categories"
        description="Make your spending meaningful. Set a budget where it matters."
      >
        <EntityForm entity="category" label="Add category" />
      </PageHeader>
      {["Expense", "Income"].map((type) => (
        <Panel
          key={type}
          title={
            type === "Expense" ? "Expense categories" : "Income categories"
          }
          subtitle={
            type === "Expense"
              ? "Monthly budgets apply to pure-consumption spending."
              : "Keep track of where your money comes from."
          }
        >
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Monthly budget</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {categories
                  .filter((c) => c.type === type)
                  .map((c) => (
                    <tr key={c.id}>
                      <td>
                        <strong>{c.name}</strong>
                      </td>
                      <td className="muted">{c.description || "—"}</td>
                      <td className="numeric-left">
                        {c.budget === null ? "Not set" : money(c.budget)}
                      </td>
                      <td>
                        <span className={"badge " + (c.archived ? "" : "good")}>
                          {c.archived ? "Archived" : "Active"}
                        </span>
                      </td>
                      <td className="numeric">
                        <EntityForm
                          entity="category"
                          label="Edit"
                          variant="ghost"
                          small
                          initial={{
                            ...c,
                            budget: c.budget?.toFixed(2) || "",
                            description: c.description || "",
                            icon: c.icon || "",
                          }}
                        />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ))}
      <p className="footnote">
        Archive a category to keep it out of new transactions. Existing history
        remains intact.
      </p>
    </>
  );
}
