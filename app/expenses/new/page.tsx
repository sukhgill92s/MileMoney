"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";
import Shell from "@/components/Shell";
import { useLocale } from "@/lib/locale";
import { toISODate } from "@/lib/week";
import { CATEGORIES, categoryLabelKey } from "@/lib/expenses";
import { parseReceiptText } from "@/lib/receiptOcr";

/** Editable AI scan result, per the approved mockup: receipt preview on
 * top, auto-filled Vendor / Amount / Date / Category below, Retake to
 * start over, Confirm & Save to save. Nothing here calls a paid API —
 * the values come from on-device OCR + smart parsing only. */
interface ScanReview {
  vendor: string;
  amount: string;
  date: string;
  category: string;
  currency: string;
}

function NewExpenseForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLocale();
  const scanRequested = searchParams.get("scan") === "1";
  const fileRef = useRef<HTMLInputElement>(null);

  const [date, setDate] = useState(toISODate(new Date()));
  const [category, setCategory] = useState<string>("diesel");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("CAD");
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [scanning, setScanning] = useState(false);
  const [scanNote, setScanNote] = useState("");
  const [review, setReview] = useState<ScanReview | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  function onPhotoChange(f: File | null) {
    setPhoto(f);
    setScanNote("");
    setReview(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(f ? URL.createObjectURL(f) : null);
  }

  function handleRetake() {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhoto(null);
    setPhotoPreview(null);
    setReview(null);
    setScanNote("");
    setError("");
    if (fileRef.current) fileRef.current.value = "";
  }

  /** Run on-device OCR on the receipt photo and open the review screen
   * with auto-filled vendor, amount, date and category. Every field
   * stays editable; a failed scan just falls back to manual entry —
   * the button never blocks saving. */
  async function handleScan() {
    if (!photo) {
      setError(t.choosePhotoFirst);
      return;
    }
    setError("");
    setScanNote("");
    setReview(null);
    setScanning(true);
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng");
      try {
        const {
          data: { text },
        } = await worker.recognize(photo);
        const found = parseReceiptText(text);
        const anythingFound =
          found.amount !== null ||
          found.date !== null ||
          found.vendor !== null ||
          found.category !== null;
        if (!anythingFound) {
          setScanNote(t.scanNoData);
          return;
        }
        setReview({
          vendor: found.vendor ?? "",
          amount: found.amount !== null ? found.amount.toFixed(2) : "",
          date: found.date ?? toISODate(new Date()),
          category: found.category ?? category,
          currency,
        });
        setScanNote(t.scannedCheck);
      } finally {
        await worker.terminate();
      }
    } catch {
      setScanNote(t.scanFailed);
    } finally {
      setScanning(false);
    }
  }

  async function saveExpense(values: {
    date: string;
    category: string;
    amount: string;
    currency: string;
    note: string;
  }) {
    setError("");
    const amountNum = parseFloat(values.amount);
    if (!values.date || isNaN(amountNum) || amountNum <= 0) {
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

      let receiptPath: string | null = null;
      if (photo) {
        const ext = photo.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `personal/${user.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("receipts")
          .upload(path, photo, { contentType: photo.type || "image/jpeg" });
        if (upErr) throw upErr;
        receiptPath = path;
      }

      const { error: insErr } = await supabase.from("personal_expenses").insert({
        user_id: user.id,
        expense_date: values.date,
        category: values.category,
        amount_cad: amountNum,
        currency: values.currency,
        note: values.note.trim() || null,
        receipt_path: receiptPath,
      });
      if (insErr) throw insErr;
      setSaved(true);
      setTimeout(() => router.push("/dashboard"), 1200);
    } catch {
      setError(t.saveError);
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await saveExpense({ date, category, amount, currency, note });
  }

  /** Confirm & Save from the review screen: the detected vendor becomes
   * the note (kept alongside any note already typed, so nothing is lost). */
  async function handleConfirmSave() {
    if (!review) return;
    const parts = [review.vendor.trim(), note.trim()].filter(
      (p, i, arr) => p !== "" && arr.indexOf(p) === i
    );
    await saveExpense({
      date: review.date,
      category: review.category,
      amount: review.amount,
      currency: review.currency,
      note: parts.join(" — "),
    });
  }

  return (
    <Shell active={scanRequested ? "scan" : "expenses"}>
      <div className="container">
        <div className="card">
          <h1>{review ? t.scanResultTitle : t.addExpenseTitle}</h1>
          {scanRequested && !review && <p className="muted">{t.scanHint}</p>}
          {saved ? (
            <div className="success-box">{t.expenseSaved}</div>
          ) : review ? (
            <div>
              {error && <div className="error-box">{error}</div>}
              {photoPreview && (
                <div className="scan-receipt-preview">
                  <p className="muted">{t.scannedReceipt}</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoPreview} alt={t.scannedReceipt} />
                </div>
              )}
              <div className="scan-detected">
                <p className="scan-detected-head">
                  <span>✨ {t.aiDetected}</span>{" "}
                  <span className="ai-chip">{t.aiAutoFilled}</span>
                </p>
                <p className="muted">{t.aiFilledNote}</p>
              </div>
              <div className="field">
                <label htmlFor="rvendor">{t.vendor}</label>
                <input
                  id="rvendor"
                  type="text"
                  value={review.vendor}
                  onChange={(e) =>
                    setReview({ ...review, vendor: e.target.value })
                  }
                  placeholder={t.vendorPlaceholder}
                  maxLength={120}
                />
              </div>
              <div className="field">
                <label htmlFor="ramount">{t.amount}</label>
                <input
                  id="ramount"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0.01"
                  required
                  value={review.amount}
                  onChange={(e) =>
                    setReview({ ...review, amount: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>
              <div className="field">
                <label htmlFor="rcurrency">{t.currency}</label>
                <select
                  id="rcurrency"
                  value={review.currency}
                  onChange={(e) =>
                    setReview({ ...review, currency: e.target.value })
                  }
                >
                  <option value="CAD">CAD</option>
                  <option value="USD">USD</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="rdate">{t.date}</label>
                <input
                  id="rdate"
                  type="date"
                  required
                  value={review.date}
                  max={toISODate(new Date())}
                  onChange={(e) =>
                    setReview({ ...review, date: e.target.value })
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="rcat">{t.category}</label>
                <select
                  id="rcat"
                  value={review.category}
                  onChange={(e) =>
                    setReview({ ...review, category: e.target.value })
                  }
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {t[categoryLabelKey(c.value)]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="btn-row">
                <button
                  type="button"
                  className="btn"
                  onClick={handleConfirmSave}
                  disabled={saving}
                >
                  {saving ? t.saving : t.confirmSave}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleRetake}
                  disabled={saving}
                >
                  {t.retakePhoto}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && <div className="error-box">{error}</div>}
              <div className="field">
                <label htmlFor="edate">{t.date}</label>
                <input
                  id="edate"
                  type="date"
                  required
                  value={date}
                  max={toISODate(new Date())}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="ecat">{t.category}</label>
                <select
                  id="ecat"
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
                <label htmlFor="eamount">{t.amount}</label>
                <input
                  id="eamount"
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
                <label htmlFor="ecurrency">{t.currency}</label>
                <select
                  id="ecurrency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  <option value="CAD">CAD</option>
                  <option value="USD">USD</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="enote">{t.note}</label>
                <input
                  id="enote"
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={t.notePlaceholder}
                  maxLength={120}
                />
              </div>
              <div className="field">
                <label htmlFor="ephoto">{t.receiptPhoto}</label>
                <input
                  ref={fileRef}
                  id="ephoto"
                  type="file"
                  accept="image/*"
                  onChange={(e) => onPhotoChange(e.target.files?.[0] ?? null)}
                />
                {photoPreview && (
                  <div className="exp-photo-preview">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photoPreview} alt={t.receiptPhoto} />
                  </div>
                )}
                <div className="btn-row">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleScan}
                    disabled={!photo || scanning}
                  >
                    {scanning ? t.scanning : t.scanReceipt}
                  </button>
                </div>
                {scanNote && <p className="muted">{scanNote}</p>}
              </div>
              <div className="btn-row">
                <button type="submit" className="btn" disabled={saving}>
                  {saving ? t.saving : t.saveExpense}
                </button>
                <Link href="/dashboard" className="btn-secondary">
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

function LoadingFallback() {
  const { t } = useLocale();
  return (
    <main className="container">
      <p className="muted">{t.loading}</p>
    </main>
  );
}

export default function NewExpensePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <NewExpenseForm />
    </Suspense>
  );
}
