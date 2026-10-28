import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { createClient } from "@/lib/supabaseServer";
import {
  STRINGS,
  dateLocale,
  resolveLocale,
} from "@/lib/strings";
import {
  CATEGORIES,
  categoryLabelKey,
  isMonth,
  monthLabel,
  monthRange,
  type PersonalExpense,
} from "@/lib/expenses";
import {
  asCurrency,
  money,
  monthSummary,
  toMinor,
  type Currency,
  type LoadPaymentRow,
  type LoadRow,
} from "@/lib/finance";
import { prettyDate } from "@/lib/week";

/**
 * GET /api/monthly-pdf?month=YYYY-MM&lang=en|fr
 * Signed-in users only. Streams a PDF of their own personal expenses for
 * the month, rendered in the requested language (default English): a
 * per-currency category-wise breakdown, the month's expense list, and a
 * per-currency operating-profit section (delivery-date income method).
 * Currencies are never summed together.
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
    const locale = dateLocale(lang);

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

    // Loads + payments for the profit section. Missing tables (before
    // migration 0008) just mean no income data yet.
    const { data: lData, error: lErr } = await supabase
      .from("loads")
      .select("*")
      .eq("user_id", user.id);
    const loads = (lErr ? [] : (lData ?? [])) as LoadRow[];
    const { data: pData, error: pErr } = await supabase
      .from("load_payments")
      .select("*")
      .eq("user_id", user.id);
    const payments = (pErr ? [] : (pData ?? [])) as LoadPaymentRow[];

    const doc = new PDFDocument({ margin: 48, size: "letter" });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    const done = new Promise<Buffer>((resolve) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
    });

    doc.fontSize(20).text(t.pdfTitle);
    doc.fontSize(13).text(monthLabel(month, locale));
    doc.moveDown();

    const expenseCurrency = (e: PersonalExpense) => asCurrency(e.currency);
    const currenciesPresent = (["CAD", "USD"] as Currency[]).filter(
      (cur) => expenses.some((e) => expenseCurrency(e) === cur)
    );
    const breakdownCurrencies =
      currenciesPresent.length > 0 ? currenciesPresent : (["CAD"] as Currency[]);

    for (const cur of breakdownCurrencies) {
      const rows = expenses.filter((e) => expenseCurrency(e) === cur);
      const total = rows.reduce((s, e) => s + Number(e.amount_cad), 0);
      doc.fontSize(14).text(`${t.pdfBreakdown} (${cur})`);
      doc.moveDown(0.5);
      for (const c of CATEGORIES) {
        const catRows = rows.filter((e) => e.category === c.value);
        const sum = catRows.reduce((s, e) => s + Number(e.amount_cad), 0);
        const countWord =
          catRows.length === 1 ? t.expenseOne : t.expenseMany;
        doc
          .fontSize(12)
          .text(
            `${t[categoryLabelKey(c.value)]}: ${money(toMinor(sum), cur, locale)} (${catRows.length} ${countWord})`
          );
      }
      doc.moveDown(0.5);
      doc
        .fontSize(13)
        .text(`${t.pdfMonthTotal}${money(toMinor(total), cur, locale)}`);
      doc.moveDown();
    }

    doc.fontSize(14).text(t.pdfExpenses);
    doc.moveDown(0.5);
    if (expenses.length === 0) {
      doc.fontSize(12).text(t.pdfNoExpenses);
    } else {
      for (const e of expenses) {
        const label = t[categoryLabelKey(e.category)];
        const note = e.note ? ` — ${e.note}` : "";
        doc
          .fontSize(12)
          .text(
            `${prettyDate(e.expense_date, locale)} · ${label}${note}: ${money(
              toMinor(Number(e.amount_cad)),
              expenseCurrency(e),
              locale
            )}`
          );
      }
    }
    doc.moveDown();

    // Operating profit, delivery-date method, per currency.
    const summaries = monthSummary(
      month,
      expenses.map((e) => ({
        expense_date: e.expense_date,
        amountMinor: toMinor(Number(e.amount_cad)),
        currency: expenseCurrency(e),
      })),
      loads,
      payments,
      "delivery"
    );
    doc.fontSize(14).text(t.profitHeading);
    doc.moveDown(0.5);
    for (const s of summaries) {
      if (
        s.currency !== "CAD" &&
        s.income === 0 &&
        s.spending === 0 &&
        s.outstanding === 0
      ) {
        continue;
      }
      doc.fontSize(12).text(
        `${s.currency} — ${t.income}: ${money(s.income, s.currency, locale)} · ${t.expensesHeading}: ${money(s.spending, s.currency, locale)} · ${t.profitLabel}: ${money(s.profit, s.currency, locale)} · ${t.pdfOutstanding}: ${money(s.outstanding, s.currency, locale)}`
      );
    }
    doc.moveDown();
    doc.fontSize(10).text(t.pdfGenerated);

    doc.end();
    const pdf = await done;

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="MileMoney-expenses-${month}.pdf"`,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not generate the PDF." },
      { status: 500 }
    );
  }
}
