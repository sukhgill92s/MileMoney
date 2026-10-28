"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";
import Shell from "@/components/Shell";
import { useLocale } from "@/lib/locale";
import { cad } from "@/lib/week";
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

  return (
    <Shell>
      <div className="container">
        {/* ONE compact month selector: prev/next arrows + the month
          picker. No duplicate month text label anywhere on this page. */}
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

        <div className="card exp-hero">
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

        {/* Profit FIRST, above Category Summary (v1.3). Per-currency
          cards with Income, Expenses, Profit, Outstanding; the
          delivery/cash toggle switches the income method. */}
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

        {/* Category Summary as a compact list: one row per category
          with label, amount and a thin teal progress bar for share
          of the currency total (reuses the existing pct value). */}
        {(["CAD", "USD"] as Currency[])
          .filter((cur) => cur === "CAD" || hasUsdExpenses)
          .map((cur) => {
            const cats = byCategory(cur);
            return (
              <div key={cur}>
                <h2 className="exp-section-title">
                  {t.categorySummary}
                  {hasUsdExpenses ? ` (${cur})` : ""}
                </h2>
                <div className="exp-cat-list">
                  {cats.map((c) => (
                    <div key={c.value} className="card exp-cat-row">
                      <div className="exp-cat-row-top">
                        <span aria-hidden="true">
                          {CATEGORY_ICONS[c.value] ?? "📦"}
                        </span>
                        <span className="exp-cat-row-label">{c.label}</span>
                        <span className="exp-cat-row-amount">
                          {money(toMinor(c.sum), cur, locale)}
                        </span>
                      </div>
                      <div className="exp-cat-bar">
                        <div
                          className="exp-cat-bar-fill"
                          style={{
                            width: `${Math.min(100, Math.max(0, c.pct))}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

        <div className="btn-row exp-actions">
          <Link href="/expenses/new" className="btn">
            ＋ {t.addExpense}
          </Link>
          <Link href="/expenses/new?scan=1" className="btn-secondary">
            {t.scanReceipt}
          </Link>
          <Link href="/income" className="btn-secondary">
            ＋ {t.income}
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

        {/* The expense list moved to /expenses in v1.3 (with search,
          filters, Edit, Delete and View Receipt) — it no longer lives
          on the dashboard. */}
      </div>
    </Shell>
  );
}
