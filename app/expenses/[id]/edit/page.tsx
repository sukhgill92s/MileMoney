"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";
import Shell from "@/components/Shell";
import { useLocale } from "@/lib/locale";
import { toISODate } from "@/lib/week";
import { CATEGORIES, categoryLabelKey } from "@/lib/expenses";

/**
 * Edit an expense (v1.3): prefilled date, category, amount, currency and
 * note. There is deliberately NO receipt control here — the existing
 * receipt stays untouched by edits (receipts are deleted only through
 * the separate checkbox in the delete dialog). Ownership is enforced
 * twice: the row is fetched scoped to the session user, its user_id is
 * checked against the session, and the update is scoped with
 * eq("user_id") on top of the RLS own-rows policy.
 */
export default function EditExpensePage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useLocale();
  const id = typeof params.id === "string" ? params.id : "";

  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(toISODate(new Date()));
  const [category, setCategory] = useState<string>("diesel");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("CAD");
  const [note, setNote] = useState("");
  const [hasReceipt, setHasReceipt] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.push("/login");
          return;
        }
        const { data, error: qErr } = await supabase
          .from("personal_expenses")
          .select("*")
          .eq("id", id)
          .eq("user_id", user.id)
          .single();
        if (qErr || !data) {
          if (!cancelled) setError(t.expenseNotFound);
          return;
        }
        if (data.user_id !== user.id) {
          if (!cancelled) setError(t.notYourExpense);
          return;
        }
        if (!cancelled) {
          setDate(data.expense_date);
          setCategory(data.category);
          setAmount(Number(data.amount_cad).toFixed(2));
          setCurrency(data.currency ?? "CAD");
          setNote(data.note ?? "");
          setHasReceipt(Boolean(data.receipt_path));
        }
      } catch {
        if (!cancelled) setError(t.expenseNotFound);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, router, t]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const amountNum = parseFloat(amount);
    if (!date || isNaN(amountNum) || amountNum <= 0) {
      setError(t.invalidAmount);
      return;
    }
    setSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const { error: upErr } = await supabase
        .from("personal_expenses")
        .update({
          expense_date: date,
          category,
          amount_cad: amountNum,
          currency,
          note: note.trim() || null,
        })
        .eq("id", id)
        .eq("user_id", user.id);
      if (upErr) throw upErr;
      setSaved(true);
      setTimeout(() => router.push("/expenses"), 1200);
    } catch {
      setError(t.updateError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Shell active="expenses">
      <div className="container">
        <div className="card">
          <h1>{t.editExpense}</h1>
          {loading ? (
            <p className="muted">{t.loading}</p>
          ) : error && !saved ? (
            <div className="error-box">{error}</div>
          ) : saved ? (
            <div className="success-box">{t.expenseUpdated}</div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && <div className="error-box">{error}</div>}
              <div className="field">
                <label htmlFor="xdate">{t.date}</label>
                <input
                  id="xdate"
                  type="date"
                  required
                  value={date}
                  max={toISODate(new Date())}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="xcat">{t.category}</label>
                <select
                  id="xcat"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {t[categoryLabelKey(c.value)]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="xamount">{t.amount}</label>
                <input
                  id="xamount"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="field">
                <label htmlFor="xcurrency">{t.currency}</label>
                <select
                  id="xcurrency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  <option value="CAD">CAD</option>
                  <option value="USD">USD</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="xnote">{t.note}</label>
                <input
                  id="xnote"
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={t.notePlaceholder}
                  maxLength={120}
                />
              </div>
              {hasReceipt && <p className="muted">{t.editReceiptKept}</p>}
              <div className="btn-row">
                <button type="submit" className="btn" disabled={saving}>
                  {saving ? t.saving : t.saveChanges}
                </button>
                <Link href="/expenses" className="btn-secondary">
                  {t.cancel}
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </Shell>
  );
}
