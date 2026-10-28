"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import Shell from "@/components/Shell";
import { useLocale } from "@/lib/locale";
import { prettyDate, toISODate } from "@/lib/week";
import {
  asCurrency,
  loadStatus,
  money,
  netLoad,
  outstandingFor,
  paidFor,
  toMinor,
  validatePayment,
  type LoadPaymentRow,
  type LoadRow,
} from "@/lib/finance";

/** Income page (v1.1, v1.4 adds miles + due date): loads with status
 * pills, net / received / outstanding per load, add-load form,
 * record-payment form with overpayment rejection, delete-load
 * (payments cascade in the DB). No paid APIs anywhere on this page. */

const PILL_CLASS: Record<string, string> = {
  paid: "pill pill-paid",
  partial: "pill pill-partial",
  unpaid: "pill pill-unpaid",
  overdue: "pill pill-overdue",
};

function isMissingTable(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return (
    error.code === "PGRST205" ||
    (error.message ?? "").includes("Could not find the table")
  );
}

export default function IncomePage() {
  const { t, locale } = useLocale();
  const [loads, setLoads] = useState<LoadRow[]>([]);
  const [payments, setPayments] = useState<LoadPaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [payFor, setPayFor] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Add-load form state (amounts in dollars; stored as minor units).
  const [reference, setReference] = useState("");
  const [counterparty, setCounterparty] = useState("");
  const [pickup, setPickup] = useState("");
  const [delivery, setDelivery] = useState(toISODate(new Date()));
  const [currency, setCurrency] = useState("CAD");
  const [gross, setGross] = useState("");
  const [surcharge, setSurcharge] = useState("");
  const [accessorials, setAccessorials] = useState("");
  const [deductions, setDeductions] = useState("");
  const [notes, setNotes] = useState("");
  // v1.4: optional trip miles + payment due date (migration 0009).
  const [miles, setMiles] = useState("");
  const [dueOn, setDueOn] = useState("");

  // Record-payment form state (one open form at a time).
  const [payDate, setPayDate] = useState(toISODate(new Date()));
  const [payAmount, setPayAmount] = useState("");
  const [payMemo, setPayMemo] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError(t.pleaseSignIn);
        return;
      }
      const { data: lData, error: lErr } = await supabase
        .from("loads")
        .select("*")
        .eq("user_id", user.id)
        .order("delivery_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (lErr && !isMissingTable(lErr)) throw lErr;
      const { data: pData, error: pErr } = await supabase
        .from("load_payments")
        .select("*")
        .eq("user_id", user.id)
        .order("paid_on", { ascending: false });
      if (pErr && !isMissingTable(pErr)) throw pErr;
      setLoads((lData ?? []) as LoadRow[]);
      setPayments((pData ?? []) as LoadPaymentRow[]);
    } catch {
      setError(t.incomeLoadError);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveLoad(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    const grossNum = parseFloat(gross);
    const surNum = parseFloat(surcharge || "0");
    const accNum = parseFloat(accessorials || "0");
    const dedNum = parseFloat(deductions || "0");
    const milesNum = miles.trim() === "" ? null : parseFloat(miles);
    if (
      !reference.trim() ||
      !counterparty.trim() ||
      !delivery ||
      isNaN(grossNum) ||
      grossNum < 0 ||
      isNaN(surNum) ||
      surNum < 0 ||
      isNaN(accNum) ||
      accNum < 0 ||
      isNaN(dedNum) ||
      dedNum < 0 ||
      (milesNum !== null && (isNaN(milesNum) || milesNum < 0))
    ) {
      setError(t.invalidLoad);
      return;
    }
    setSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { error: insErr } = await supabase.from("loads").insert({
        user_id: user.id,
        reference: reference.trim(),
        counterparty: counterparty.trim(),
        pickup_date: pickup || null,
        delivery_date: delivery,
        currency,
        gross_minor: toMinor(grossNum),
        surcharge_minor: toMinor(surNum),
        accessorial_minor: toMinor(accNum),
        deductions_minor: toMinor(dedNum),
        distance_miles: milesNum,
        due_on: dueOn || null,
        notes: notes.trim() || null,
      });
      if (insErr) throw insErr;
      setReference("");
      setCounterparty("");
      setPickup("");
      setDelivery(toISODate(new Date()));
      setGross("");
      setSurcharge("");
      setAccessorials("");
      setDeductions("");
      setMiles("");
      setDueOn("");
      setNotes("");
      setShowForm(false);
      setNotice(t.loadSaved);
      await load();
    } catch {
      setError(t.saveLoadError);
    } finally {
      setSaving(false);
    }
  }

  async function savePayment(e: React.FormEvent, loadRow: LoadRow) {
    e.preventDefault();
    setError("");
    setNotice("");
    const amountNum = parseFloat(payAmount);
    if (!payDate || isNaN(amountNum)) {
      setError(t.invalidPayment);
      return;
    }
    const amountMinor = toMinor(amountNum);
    const problem = validatePayment(loadRow, payments, amountMinor);
    if (problem === "invalidAmount") {
      setError(t.invalidPayment);
      return;
    }
    if (problem === "overpayment") {
      setError(t.overpaymentError);
      return;
    }
    setSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { error: insErr } = await supabase.from("load_payments").insert({
        user_id: user.id,
        load_id: loadRow.id,
        paid_on: payDate,
        amount_minor: amountMinor,
        currency: loadRow.currency,
        memo: payMemo.trim() || null,
      });
      if (insErr) throw insErr;
      setPayFor(null);
      setPayAmount("");
      setPayMemo("");
      setNotice(t.paymentSaved);
      await load();
    } catch {
      setError(t.savePaymentError);
    } finally {
      setSaving(false);
    }
  }

  async function deleteLoad(loadRow: LoadRow) {
    if (!window.confirm(t.deleteLoadConfirm)) return;
    setError("");
    try {
      const supabase = createClient();
      const { error: delErr } = await supabase
        .from("loads")
        .delete()
        .eq("id", loadRow.id);
      if (delErr) throw delErr;
      await load();
    } catch {
      setError(t.saveLoadError);
    }
  }

  return (
    <Shell active="income">
      <div className="container">
        <h1>{t.incomeTitle}</h1>
        <p className="muted">{t.incomeSub}</p>

        {error && <div className="error-box">{error}</div>}
        {notice && <div className="success-box">{notice}</div>}

        <div className="btn-row exp-actions">
          <button
            type="button"
            className="btn"
            onClick={() => setShowForm(!showForm)}
          >
            {t.addLoadBtn}
          </button>
        </div>

        {showForm && (
          <form className="card" onSubmit={saveLoad}>
            <div className="formgrid">
              <label>
                {t.loadReference}
                <input
                  type="text"
                  required
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="LOAD-1042"
                  maxLength={120}
                />
              </label>
              <label>
                {t.carrierBroker}
                <input
                  type="text"
                  required
                  value={counterparty}
                  onChange={(e) => setCounterparty(e.target.value)}
                  maxLength={120}
                />
              </label>
              <label>
                {t.currency}
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  <option value="CAD">CAD</option>
                  <option value="USD">USD</option>
                </select>
              </label>
              <label>
                {t.pickupDate}
                <input
                  type="date"
                  value={pickup}
                  onChange={(e) => setPickup(e.target.value)}
                />
              </label>
              <label>
                {t.deliveryDate}
                <input
                  type="date"
                  required
                  value={delivery}
                  onChange={(e) => setDelivery(e.target.value)}
                />
              </label>
              <label>
                {t.grossFreight}
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  required
                  value={gross}
                  onChange={(e) => setGross(e.target.value)}
                  placeholder="0.00"
                />
              </label>
              <label>
                {t.fuelSurcharge}
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={surcharge}
                  onChange={(e) => setSurcharge(e.target.value)}
                  placeholder="0.00"
                />
              </label>
              <label>
                {t.accessorials}
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={accessorials}
                  onChange={(e) => setAccessorials(e.target.value)}
                  placeholder="0.00"
                />
              </label>
              <label>
                {t.carrierDeductions}
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={deductions}
                  onChange={(e) => setDeductions(e.target.value)}
                  placeholder="0.00"
                />
              </label>
              <label>
                {t.tripMiles}
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min="0"
                  value={miles}
                  onChange={(e) => setMiles(e.target.value)}
                  placeholder="1250"
                />
              </label>
              <label>
                {t.paymentDue}
                <input
                  type="date"
                  value={dueOn}
                  onChange={(e) => setDueOn(e.target.value)}
                />
              </label>
              <label className="full">
                {t.note}
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={200}
                />
              </label>
              <button type="submit" className="btn" disabled={saving}>
                {saving ? t.saving : t.saveLoad}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowForm(false)}
                disabled={saving}
              >
                {t.cancel}
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="card">
            <p className="muted">{t.loading}</p>
          </div>
        ) : loads.length === 0 ? (
          <p className="empty">{t.noLoads}</p>
        ) : (
          loads.map((l) => {
            const status = loadStatus(l, payments);
            const paid = paidFor(l.id, payments);
            const left = outstandingFor(l, payments);
            const cur = asCurrency(l.currency);
            const statusLabel =
              status === "paid"
                ? t.statusPaid
                : status === "overdue"
                  ? t.statusOverdue
                  : status === "partial"
                    ? t.statusPartial
                    : t.statusUnpaid;
            const milesNum = l.distance_miles ?? null;
            return (
              <div key={l.id} className="loadcard">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    alignItems: "flex-start",
                  }}
                >
                  <div>
                    <strong>{l.reference}</strong>
                    <p className="muted" style={{ margin: "5px 0" }}>
                      {l.counterparty} · {t.delivered}{" "}
                      {prettyDate(l.delivery_date, locale)}
                    </p>
                  </div>
                  <span className={PILL_CLASS[status]}>{statusLabel}</span>
                </div>
                {milesNum !== null && milesNum > 0 && (
                  <p className="muted" style={{ margin: "5px 0" }}>
                    {milesNum.toLocaleString(locale)} {t.milesUnit} ·{" "}
                    {money(netLoad(l) / milesNum, cur, locale)}
                    {t.perMile}
                  </p>
                )}
                <div className="loadstats">
                  <span>
                    {t.netAmount}
                    <b>{money(netLoad(l), cur, locale)}</b>
                  </span>
                  <span>
                    {t.received}
                    <b>{money(paid, cur, locale)}</b>
                  </span>
                  <span>
                    {t.outstanding}
                    <b>{money(left, cur, locale)}</b>
                  </span>
                </div>
                <div className="btn-row">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setPayFor(payFor === l.id ? null : l.id);
                      setPayDate(toISODate(new Date()));
                      setPayAmount("");
                      setPayMemo("");
                    }}
                  >
                    {t.recordPayment}
                  </button>
                  <button
                    type="button"
                    className="btn-danger"
                    onClick={() => deleteLoad(l)}
                  >
                    {t.deleteLoad}
                  </button>
                </div>
                {payFor === l.id && (
                  <form
                    className="formgrid"
                    style={{
                      marginTop: 18,
                      borderTop: "1px solid var(--line)",
                      paddingTop: 18,
                    }}
                    onSubmit={(e) => savePayment(e, l)}
                  >
                    <label>
                      {t.paymentDate}
                      <input
                        type="date"
                        required
                        value={payDate}
                        onChange={(e) => setPayDate(e.target.value)}
                      />
                    </label>
                    <label>
                      {t.paymentAmount} ({cur})
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0.01"
                        max={(left / 100).toFixed(2)}
                        required
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                        placeholder="0.00"
                      />
                    </label>
                    <label>
                      {t.memo}
                      <input
                        type="text"
                        value={payMemo}
                        onChange={(e) => setPayMemo(e.target.value)}
                        maxLength={120}
                      />
                    </label>
                    <button type="submit" className="btn" disabled={saving}>
                      {saving ? t.saving : t.savePayment}
                    </button>
                  </form>
                )}
              </div>
            );
          })
        )}
      </div>
    </Shell>
  );
}
