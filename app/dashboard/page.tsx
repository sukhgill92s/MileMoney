"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";
import Shell from "@/components/Shell";
import { useLocale } from "@/lib/locale";
import { cad, prettyDate } from "@/lib/week";
import {
  asCurrency,
  money,
  monthSummary,
  toMinor,
  type Currency,
  type LoadPaymentRow,
  type LoadRow,
  type ProfitMethod,
} from "@/lib/finance";
import {
  CATEGORIES,
  categoryLabelKey,
  monthKey,
  monthLabel,
  monthRange,
  shiftMonth,
  type PersonalExpense,
} from "@/lib/expenses";

const CATEGORY_ICONS: Record<string, string> = {
  diesel: "⛽",
  repair: "🔧",
  toll: "🛣️",
  food: "🍽️",
  other: "📦",
};

export default function DashboardPage() {
  const { lang, t, locale } = useLocale();
  const [month, setMonth] = useState(monthKey(new Date()));
  const [expenses, setExpenses] = useState<PersonalExpense[]>([]);
  const [loads, setLoads] = useState<LoadRow[]>([]);
  const [payments, setPayments] = useState<LoadPaymentRow[]>([]);
  const [method, setMethod] = useState<ProfitMethod>("delivery");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const [receiptBusy, setReceiptBusy] = useState<string | null>(null);

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
        .order("expense_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (qErr) throw qErr;
      setExpenses((data ?? []) as PersonalExpense[]);
      // Loads + payments power the profit section. A missing table
      // (before migration 0008 is applied) just means no income data
      // yet — it must not break the dashboard.
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
  const totalsByCurrency = (currency: Currency) =>
    expenses
      .filter((e) => expenseCurrency(e) === currency)
      .reduce((s, e) => s + Number(e.amount_cad), 0);
  const cadTotal = totalsByCurrency("CAD");
  const usdTotal = totalsByCurrency("USD");
  const hasUsdExpenses =
    usdTotal > 0 || expenses.some((e) => expenseCurrency(e) === "USD");
  const byCategory = (currency: Currency) => {
    const rows = expenses.filter((e) => expenseCurrency(e) === currency);
    const total = rows.reduce((s, e) => s + Number(e.amount_cad), 0);
    return CATEGORIES.map((c) => {
      const sum = rows
        .filter((e) => e.category === c.value)
        .reduce((s, e) => s + Number(e.amount_cad), 0);
      return {
        ...c,
        label: t[categoryLabelKey(c.value)],
        sum,
        pct: total > 0 ? (sum / total) * 100 : 0,
      };
    });
  };
  const summaries = monthSummary(
    month,
    expenses.map((e) => ({
      expense_date: e.expense_date,
      amountMinor: toMinor(Number(e.amount_cad)),
      currency: expenseCurrency(e),
    })),
    loads,
    payments,
    method
  );
  const visibleSummaries = summaries.filter(
    (s) =>
      s.currency === "CAD" ||
      s.income !== 0 ||
      s.spending !== 0 ||
      s.outstanding !== 0
  );

  async function downloadPdf() {
    setPdfBusy(true);
    setPdfError("");
    try {
      const res = await fetch(
        `/api/monthly-pdf?month=${encodeURIComponent(month)}&lang=${lang}`
      );
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? t.pdfError);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `MileMoney-expenses-${month}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setPdfError(t.pdfError);
    } finally {
      setPdfBusy(false);
    }
  }

  async function viewReceipt(path: string) {
    setReceiptBusy(path);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.storage
        .from("receipts")
        .createSignedUrl(path, 120);
      if (error) throw error;
      if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener");
    } catch {
      setError(t.receiptError);
    } finally {
      setReceiptBusy(null);
    }
  }

  return (
    <Shell>
      <div className="container">
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
            <div className="exp-month-label">{monthLabel(month, locale)}</div>
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

        <div className="card exp-hero">
          <div className="muted">
            {monthLabel(month, locale)} — {t.monthTotal}
          </div>
          <div className="exp-total">{cad(cadTotal, locale)}</div>
          {hasUsdExpenses && (
            <div className="exp-total" style={{ fontSize: 20 }}>
              {money(toMinor(usdTotal), "USD", locale)}
            </div>
          )}
          <div className="muted">
            {expenses.length}{" "}
            {expenses.length === 1 ? t.expenseOne : t.expenseMany}
          </div>
        </div>

        {error && <div className="error-box">{error}</div>}

        {(["CAD", "USD"] as Currency[])
          .filter((cur) => cur === "CAD" || hasUsdExpenses)
          .map((cur) => {
            const cats = byCategory(cur);
            const curTotal = cats.reduce((s, c) => s + c.sum, 0);
            return (
              <div key={cur}>
                <h2 className="exp-section-title">
                  {t.categorySummary}
                  {hasUsdExpenses ? ` (${cur})` : ""}
                </h2>
                <div className="exp-cat-grid">
                  {cats.map((c) => (
                    <div key={c.value} className="card exp-cat-card">
                      <div className="exp-cat-top">
                        <span aria-hidden="true">
                          {CATEGORY_ICONS[c.value] ?? "📦"}
                        </span>
                        <span>{c.label}</span>
                      </div>
                      <div className="exp-cat-amount">
                        {money(toMinor(c.sum), cur, locale)}
                      </div>
                      <div className="muted">
                        {curTotal > 0
                          ? `${c.pct.toFixed(0)}${t.ofTotal}`
                          : "—"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

        <h2 className="exp-section-title">{t.profitHeading}</h2>
        <div className="btn-row" style={{ marginBottom: 16 }}>
          <button
            type="button"
            className={
              method === "delivery" ? "btn-secondary active" : "btn-secondary"
            }
            onClick={() => setMethod("delivery")}
          >
            {t.deliveryDate}
          </button>
          <button
            type="button"
            className={
              method === "cash" ? "btn-secondary active" : "btn-secondary"
            }
            onClick={() => setMethod("cash")}
          >
            {t.methodCash}
          </button>
        </div>
        <div className="profit-grid">
          {visibleSummaries.map((s) => (
            <div
              key={s.currency}
              className={`card profit-card${s.profit > 0 ? " profit-positive" : ""}`}
            >
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
              <div className="profit-row">
                <span>{t.outstanding}</span>
                <b>{money(s.outstanding, s.currency, locale)}</b>
              </div>
            </div>
          ))}
        </div>
        <p className="muted">{t.profitNote}</p>

        <div className="btn-row exp-actions">
          <Link href="/expenses/new" className="btn">
            ＋ {t.addExpense}
          </Link>
          <Link href="/expenses/new?scan=1" className="btn-secondary">
            {t.scanReceipt}
          </Link>
          <button
            type="button"
            className="btn-secondary"
            onClick={downloadPdf}
            disabled={pdfBusy || expenses.length === 0}
          >
            {pdfBusy ? t.preparing : t.monthlyPdf}
          </button>
        </div>
        {pdfError && <div className="error-box">{pdfError}</div>}
        {expenses.length === 0 && !loading && (
          <p className="muted">{t.noExpensesMonth}</p>
        )}

        <h2 className="exp-section-title">
          {t.expensesHeading} — {monthLabel(month, locale)}
        </h2>
        {loading ? (
          <div className="card">
            <p className="muted">{t.loading}</p>
          </div>
        ) : (
          <div className="exp-list">
            {expenses.map((e) => (
              <div key={e.id} className="card exp-row">
                <div className="exp-row-icon" aria-hidden="true">
                  {CATEGORY_ICONS[e.category] ?? "📦"}
                </div>
                <div className="exp-row-main">
                  <div className="exp-row-title">
                    {t[categoryLabelKey(e.category)]}
                  </div>
                  <div className="muted">
                    {prettyDate(e.expense_date, locale)}
                    {e.note ? ` · ${e.note}` : ""}
                  </div>
                  {e.receipt_path && (
                    <button
                      type="button"
                      className="exp-receipt-link"
                      onClick={() => viewReceipt(e.receipt_path as string)}
                      disabled={receiptBusy === e.receipt_path}
                    >
                      {receiptBusy === e.receipt_path
                        ? t.opening
                        : t.viewReceipt}
                    </button>
                  )}
                </div>
                <div className="exp-row-amount">
                  {money(
                    toMinor(Number(e.amount_cad)),
                    asCurrency(e.currency),
                    locale
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
}
