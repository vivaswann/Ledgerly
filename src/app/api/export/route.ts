import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ledgerWhere, ledgerOrder } from "@/lib/services/queries";
import { csvCell } from "@/lib/finance";
export const runtime = "nodejs";
export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session)
    return Response.json({ error: "Sign in to continue." }, { status: 401 });
  try {
    const f = Object.fromEntries(req.nextUrl.searchParams);
    const rows = await db.transaction.findMany({
      where: ledgerWhere(session.user.id, f),
      orderBy: ledgerOrder(f),
      include: { account: true, destination: true, category: true },
    });
    const headings = [
      "Date",
      "Type",
      "Description",
      "Amount (INR)",
      "Account",
      "Destination",
      "Category",
      "Payment method",
      "Pure consumption",
      "Notes",
    ];
    const lines = rows.map((t) => [
      t.date.toISOString(),
      t.type,
      t.description,
      t.amount.toFixed(2),
      t.account.name,
      t.destination?.name,
      t.category?.name,
      t.paymentMethod,
      t.consumption ? "Yes" : "No",
      t.notes,
    ]);
    return new Response(
      "\uFEFF" +
        [headings, ...lines].map((l) => l.map(csvCell).join(",")).join("\r\n"),
      {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition":
            'attachment; filename="ledgerly-transactions.csv"',
          "Cache-Control": "private, no-store",
          Vary: "Cookie",
        },
      },
    );
  } catch {
    return Response.json({ error: "Invalid export filters." }, { status: 400 });
  }
}
