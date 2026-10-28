"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";
import Shell from "@/components/Shell";
import { useLocale } from "@/lib/locale";
import { prettyDate } from "@/lib/week";
import {
  asCurrency,
  money,
  toMinor,
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

/**
 * Expenses history (v1.3): the month's expenses with search (note text),
 * category filter chips and a month filter. Tapping a row opens an action
 * sheet with Edit, View Receipt and Delete. Delete is never instant: it
 * opens a confirmation dialog, and the receipt photo is removed from
 * storage ONLY when the "Also delete receipt photo" box is checked
 * (unchecked by default, so financial evidence is never lost by mistake).
 * Ownership is enforced twice: the client checks row.user_id against the
 * session user, and every query/delete is scoped with eq("user_id") on
 * top of the RLS own-rows policy.
 */
export default function ExpensesPage() {
  const { t, locale } = useLocale();
  const [month, setMonth] = useState(monthKey(new Date()));
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("all");
  const [expenses, setExpenses] = useState<PersonalExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [sheet, setSheet] = useState<PersonalExpense | null>(null);
  const [confirming, setConfirming] = useState<PersonalExpense | null>(null);
  const [deleteReceipt, setDeleteReceipt] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
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
    } catch {
      setError(t.loadError);
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load(month);
  }, [month, load]);

  // Changing any filter clears the transient delete notice.
  useEffect(() => {
    setNotice("");
  }, [month, search, cat]);

  const query = search.trim().toLowerCase();
  const filtered = expenses.filter(
    (e) =>
      (cat === "all" || e.category === cat) &&
      (query === "" || (e.note ?? "").toLowerCase().includes(query))
  );

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

  async function handleDelete() {
    if (!confirming) return;
    setDeleteError("");
    setDeleting(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || confirming.user_id !== user.id) {
        setDeleteError(t.notYourExpense);
        return;
      }
      // Delete the row first, scoped to the owner. The receipt file is
      // removed ONLY when the box was checked; a storage failure here
      // leaves an orphan in a private bucket, never a lost row.
      const { error: delErr } = await supabase
        .from("personal_expenses")
        .delete()
        .eq("id", confirming.id)
        .eq("user_id", user.id);
      if (delErr) throw delErr;
      if (deleteReceipt && confirming.receipt_path) {
        await supabase.storage
          .from("receipts")
          .remove([confirming.receipt_path as string]);
      }
      setExpenses((prev) => prev.filter((e) => e.id !== confirming.id));
      setConfirming(null);
      setSheet(null);
      setDeleteReceipt(false);
      setNotice(t.expenseDeleted);
    } catch {
      setDeleteError(t.deleteError);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Shell active="expenses">
      <div className="container">
        <div className="btn-row" style={{ marginBottom: 16 }}>
          <h1 style={{ margin: 0, flex: 1 }}>{t.expensesHeading}</h1>
          <Link href="/expenses/new" className="btn">
            ＋ {t.addExpense}
          </Link>
        </div>

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

        <div className="field">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.searchExpenses}
            aria-label={t.searchExpenses}
            maxLength={120}
          />
        </div>

        <div className="chip-row">
          <button
            type="button"
            className={cat === "all" ? "chip active" : "chip"}
            onClick={() => setCat("all")}
          >
            {t.allCategories}
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              className={cat === c.value ? "chip active" : "chip"}
              onClick={() => setCat(c.value)}
            >
              {t[categoryLabelKey(c.value)]}
            </button>
          ))}
        </div>

        {error && <div className="error-box">{error}</div>}
        {notice && <div className="success-box">{notice}</div>}

        {loading ? (
          <div className="card">
            <p className="muted">{t.loading}</p>
          </div>
        ) : filtered.length === 0 ? (
          <p className="muted">
            {expenses.length === 0 ? t.noExpensesMonth : t.noExpensesFound}
          </p>
        ) : (
          <div className="exp-list">
            {filtered.map((e) => (
              <button
                key={e.id}
                type="button"
                className="card exp-row exp-row-btn"
                onClick={() => setSheet(e)}
              >
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
                </div>
                {e.receipt_path && (
                  <span aria-hidden="true" title={t.viewReceipt}>
                    📎
                  </span>
                )}
                <div className="exp-row-amount">
                  {money(
                    toMinor(Number(e.amount_cad)),
                    asCurrency(e.currency),
                    locale
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Action sheet for the tapped row. */}
        {sheet && !confirming && (
          <div className="sheet-backdrop" onClick={() => setSheet(null)}>
            <div
              className="card sheet"
              role="dialog"
              aria-label={t[categoryLabelKey(sheet.category)]}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="exp-row-title" style={{ marginBottom: 4 }}>
                {t[categoryLabelKey(sheet.category)]} ·{" "}
                {money(
                  toMinor(Number(sheet.amount_cad)),
                  asCurrency(sheet.currency),
                  locale
                )}
              </div>
              <p className="muted" style={{ marginTop: 0 }}>
                {prettyDate(sheet.expense_date, locale)}
                {sheet.note ? ` · ${sheet.note}` : ""}
              </p>
              <div className="sheet-actions">
                <Link
                  href={`/expenses/${sheet.id}/edit`}
                  className="btn-secondary"
                >
                  ✏️ {t.edit}
                </Link>
                {sheet.receipt_path && (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() =>
                      viewReceipt(sheet.receipt_path as string)
                    }
                    disabled={receiptBusy === sheet.receipt_path}
                  >
                    {receiptBusy === sheet.receipt_path
                      ? t.opening
                      : t.viewReceipt}
                  </button>
                )}
                <button
                  type="button"
                  className="btn-danger-solid"
                  onClick={() => {
                    setDeleteReceipt(false);
                    setDeleteError("");
                    setConfirming(sheet);
                  }}
                >
                  🗑️ {t.delete}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setSheet(null)}
                >
                  {t.cancel}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete confirmation dialog — never an instant delete. */}
        {confirming && (
          <div
            className="sheet-backdrop"
            onClick={() => {
              if (!deleting) setConfirming(null);
            }}
          >
            <div
              className="card sheet"
              role="alertdialog"
              aria-label={t.deleteExpenseTitle}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 style={{ marginTop: 0 }}>{t.deleteExpenseTitle}</h2>
              <p>
                {t[categoryLabelKey(confirming.category)]} ·{" "}
                {money(
                  toMinor(Number(confirming.amount_cad)),
                  asCurrency(confirming.currency),
                  locale
                )}{" "}
                · {prettyDate(confirming.expense_date, locale)}
              </p>
              <p>{t.deleteExpenseConfirm}</p>
              {confirming.receipt_path && (
                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={deleteReceipt}
                    onChange={(e) => setDeleteReceipt(e.target.checked)}
                    disabled={deleting}
                  />
                  {t.deleteReceiptAlso}
                </label>
              )}
              <p className="muted">{t.deleteReceiptNote}</p>
              {deleteError && <div className="error-box">{deleteError}</div>}
              <div className="sheet-actions">
                <button
                  type="button"
                  className="btn-danger-solid"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? t.deleting : t.deleteExpense}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setConfirming(null)}
                  disabled={deleting}
                >
                  {t.cancel}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
