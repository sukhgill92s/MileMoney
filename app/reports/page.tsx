"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import Shell from "@/components/Shell";
import { useLocale } from "@/lib/locale";
import {
  asCurrency,
  money,
  monthSummary,
  toMinor,
  type LoadPaymentRow,
  type LoadRow,
} from "@/lib/finance";
import {
  monthKey,
  monthRange,
  shiftMonth,
  type PersonalExpense,
} from "@/lib/expenses";

/**
 * Reports (v1.3): month selector, month totals (income, expenses,
 * profit — delivery-date method, per currency, never summed across
 * currencies), Monthly PDF download (the existing /api/monthly-pdf
 * route) and CSV download (the new /api/monthly-csv route).
 */
export default function ReportsPage() {
  const { lang, t, locale } = useLocale();
  const [month, setMonth] = useState(monthKey(new Date()));
  const [expenses, setExpenses] = useState<PersonalExpense[]>([]);
  const [loads, setLoads] = useState<LoadRow[]>([]);
  const [payments, setPayments] = useState<LoadPaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const [csvBusy, setCsvBusy] = useState(false);
  const [csvError, setCsvError] = useState("");

  const load = useCallback(async (m: string) => {
    setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError(t.pleaseSignIn);
        setExpenses([]);
        return;
      }
      const { start, end } = monthRange(m);
      const { data, error: qErr } = await supabase
        .from("personal_expenses")
        .select("*")
        .eq("user_id", user.id)
        .gte("expense_date", start)
        .lte("expense_date", end)
        .order("expense_date", { ascending: false });
      if (qErr) throw qErr;
      setExpenses((data ?? []) as PersonalExpense[]);
      const { data: lData, error: lErr } = await supabase
        .from("loads")
        .select("*")
        .eq("user_id", user.id)
        .order("delivery_date", { ascending: false });
      if (!lErr) setLoads((lData ?? []) as LoadRow[]);
      const { data: pData, error: pErr } = await supabase
        .from("load_payments")
        .select("*")
        .eq("user_id", user.id)
        .order("paid_on", { ascending: false });
      if (!pErr) setPayments((pData ?? []) as LoadPaymentRow[]);
    } catch {
      setError(t.loadError);
      setExpenses([]);
      setLoads([]);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load(month);
  }, [month, load]);

  const expenseCurrency = (e: PersonalExpense) => asCurrency(e.currency);
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
  const visibleSummaries = summaries.filter(
    (s) =>
      s.currency === "CAD" ||
      s.income !== 0 ||
      s.spending !== 0 ||
      s.outstanding !== 0
  );

  async function downloadFile(
    kind: "pdf" | "csv",
    setBusy: (b: boolean) => void,
    setErr: (s: string) => void,
    errKey: string
  ) {
    setBusy(true);
    setErr("");
    try {
      const ext = kind === "pdf" ? "monthly-pdf" : "monthly-csv";
      const res = await fetch(
        `/api/${ext}?month=${encodeURIComponent(month)}&lang=${lang}`
      );
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? errKey);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `MileMoney-expenses-${month}.${kind}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setErr(errKey);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell active="reports">
      <div className="container">
        <h1>{t.reports}</h1>
        <p className="muted">{t.reportsSub}</p>

        <div className="exp-monthnav card">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setMonth(shiftMonth(month, -1))}
            aria-label={t.prev}
          >
            {t.prev}
          </button>
          <div className="exp-month-center">
            <input
              type="month"
              value={month}
              max={monthKey(new Date())}
              onChange={(e) => {
                if (e.target.value) setMonth(e.target.value);
              }}
              aria-label={t.selectMonth}
            />
          </div>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setMonth(shiftMonth(month, 1))}
            disabled={shiftMonth(month, 1) > monthKey(new Date())}
            aria-label={t.next}
          >
            {t.next}
          </button>
        </div>

        {error && <div className="error-box">{error}</div>}

        {loading ? (
          <div className="card">
            <p className="muted">{t.loading}</p>
          </div>
        ) : (
          <div className="profit-grid">
            {visibleSummaries.map((s) => (
              <div key={s.currency} className="card profit-card">
                <h2 className="exp-section-title" style={{ marginTop: 0 }}>
                  {s.currency}
                </h2>
                <div className="profit-row">
                  <span>{t.income}</span>
                  <b>{money(s.income, s.currency, locale)}</b>
                </div>
                <div className="profit-row">
                  <span>{t.expensesHeading}</span>
                  <b>{money(s.spending, s.currency, locale)}</b>
                </div>
                <div className="profit-row">
                  <span>{t.profitLabel}</span>
                  <b>{money(s.profit, s.currency, locale)}</b>
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="muted">{t.profitNote}</p>

        <div className="btn-row exp-actions">
          <button
            type="button"
            className="btn"
            onClick={() =>
              downloadFile("pdf", setPdfBusy, setPdfError, t.pdfError)
            }
            disabled={pdfBusy || expenses.length === 0}
          >
            {pdfBusy ? t.preparing : t.monthlyPdf}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() =>
              downloadFile("csv", setCsvBusy, setCsvError, t.csvError)
            }
            disabled={csvBusy || expenses.length === 0}
          >
            {csvBusy ? t.preparing : t.downloadCsv}
          </button>
        </div>
        {pdfError && <div className="error-box">{pdfError}</div>}
        {csvError && <div className="error-box">{csvError}</div>}
        {expenses.length === 0 && !loading && (
          <p className="muted">{t.noExpensesMonth}</p>
        )}
      </div>
    </Shell>
  );
}
