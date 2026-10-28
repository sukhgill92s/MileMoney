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
import { cad, prettyDate } from "@/lib/week";

/**
 * GET /api/monthly-pdf?month=YYYY-MM&lang=en|fr
 * Signed-in users only. Streams a PDF of their own personal expenses for
 * the month, rendered in the requested language (default English): a
 * category-wise breakdown (each category separate) followed by the month's
 * expense list.
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

    const doc = new PDFDocument({ margin: 48, size: "letter" });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    const done = new Promise<Buffer>((resolve) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
    });

    doc.fontSize(20).text(t.pdfTitle);
    doc.fontSize(13).text(monthLabel(month, locale));
    doc.moveDown();

    const total = expenses.reduce((s, e) => s + Number(e.amount_cad), 0);
    doc.fontSize(14).text(t.pdfBreakdown);
    doc.moveDown(0.5);
    for (const c of CATEGORIES) {
      const rows = expenses.filter((e) => e.category === c.value);
      const sum = rows.reduce((s, e) => s + Number(e.amount_cad), 0);
      const countWord = rows.length === 1 ? t.expenseOne : t.expenseMany;
      doc
        .fontSize(12)
        .text(`${t[categoryLabelKey(c.value)]}: ${cad(sum, locale)} (${rows.length} ${countWord})`);
    }
    doc.moveDown(0.5);
    doc.fontSize(13).text(`${t.pdfMonthTotal}${cad(total, locale)}`);
    doc.moveDown();

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
            `${prettyDate(e.expense_date, locale)} · ${label}${note}: ${cad(
              Number(e.amount_cad),
              locale
            )}`
          );
      }
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
