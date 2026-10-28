import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import { STRINGS, resolveLocale } from "@/lib/strings";
import {
  categoryLabelKey,
  isMonth,
  monthRange,
  type PersonalExpense,
} from "@/lib/expenses";
import { asCurrency } from "@/lib/finance";
import { buildExpenseCsv } from "@/lib/monthlyCsv";

/**
 * GET /api/monthly-csv?month=YYYY-MM&lang=en|fr
 * Signed-in users only. Returns a CSV download of their own personal
 * expenses for the month — same month filtering and ownership rules as
 * the PDF route. Columns: date, category, amount, currency, note,
 * receipt (yes/no). Headers and labels follow the requested language.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") ?? "";
    if (!isMonth(month)) {
      return NextResponse.json({ error: "Invalid month." }, { status: 400 });
    }
    const lang = resolveLocale(searchParams.get("lang"));
    const t = STRINGS[lang];

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }

    const { start, end } = monthRange(month);
    const { data, error } = await supabase
      .from("personal_expenses")
      .select("*")
      .eq("user_id", user.id)
      .gte("expense_date", start)
      .lte("expense_date", end)
      .order("expense_date", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw error;
    const expenses = (data ?? []) as PersonalExpense[];

    const csv = buildExpenseCsv(
      [t.csvDate, t.csvCategory, t.csvAmount, t.csvCurrency, t.csvNote, t.csvReceipt],
      expenses.map((e) => ({
        date: e.expense_date,
        category: t[categoryLabelKey(e.category)],
        amount: Number(e.amount_cad).toFixed(2),
        currency: asCurrency(e.currency),
        note: e.note ?? "",
        receipt: e.receipt_path ? t.csvYes : t.csvNo,
      }))
    );

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="MileMoney-expenses-${month}.csv"`,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not generate the CSV." },
      { status: 500 }
    );
  }
}
