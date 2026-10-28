/**
 * Load income + profit math for MileMoney v1.1. Pure functions, no I/O,
 * no paid APIs — safe to import from client pages and the PDF route.
 *
 * Money model: loads and payments are stored as INTEGER MINOR UNITS
 * (cents) in the database, matching migration 0008. Expenses are stored
 * as dollar amounts (personal_expenses.amount_cad) and converted with
 * toMinor() before they enter a summary. Currencies are NEVER summed
 * together: every summary is produced per currency.
 */

export type Currency = "CAD" | "USD";

export const CURRENCIES: Currency[] = ["CAD", "USD"];

export interface LoadRow {
  id: string;
  user_id: string;
  reference: string;
  counterparty: string;
  pickup_date: string | null;
  delivery_date: string;
  currency: string;
  gross_minor: number;
  surcharge_minor: number;
  accessorial_minor: number;
  deductions_minor: number;
  notes: string | null;
  created_at: string;
  /** Trip miles (v1.4, migration 0009). Optional: rows written before
   * 0009, and loads saved without miles, carry null. */
  distance_miles?: number | null;
  /** Payment due date (v1.4, migration 0009). Optional, same reason. */
  due_on?: string | null;
}

export interface LoadPaymentRow {
  id: string;
  user_id: string;
  load_id: string;
  paid_on: string;
  amount_minor: number;
  currency: string;
  memo: string | null;
  created_at: string;
}

/** Minimal expense shape a summary needs. All personal_expenses rows are
 * business expenses for this single-user tracker (there is no
 * personal/business flag on expenses). */
export interface ExpenseLike {
  expense_date: string;
  amountMinor: number;
  currency: string;
}

/** Anything else maps to CAD: the app only ever writes CAD or USD, and
 * rows written before the v1.1 currency column existed are CAD. */
export function asCurrency(value: string | null | undefined): Currency {
  return value === "USD" ? "USD" : "CAD";
}

/** Dollars (e.g. 12.34) -> integer minor units (1234). */
export function toMinor(dollars: number): number {
  if (!Number.isFinite(dollars)) return 0;
  return Math.round((dollars + Number.EPSILON) * 100);
}

/** Integer minor units -> dollars. */
export function fromMinor(minor: number): number {
  return minor / 100;
}

/** "2026-10" for a YYYY-MM-DD date. */
export function monthOf(iso: string): string {
  return iso.slice(0, 7);
}

/** Net load revenue: gross + surcharge + accessorials − deductions. */
export function netLoad(load: LoadRow): number {
  return (
    load.gross_minor +
    load.surcharge_minor +
    load.accessorial_minor -
    load.deductions_minor
  );
}

/** Total paid against one load, across all its payments. */
export function paidFor(loadId: string, payments: LoadPaymentRow[]): number {
  return payments
    .filter((p) => p.load_id === loadId)
    .reduce((s, p) => s + p.amount_minor, 0);
}

/** Outstanding balance for one load, never below zero. */
export function outstandingFor(load: LoadRow, payments: LoadPaymentRow[]): number {
  return Math.max(0, netLoad(load) - paidFor(load.id, payments));
}

export type LoadStatus = "paid" | "partial" | "unpaid" | "overdue";

/**
 * Status pill rule (v1.4, ported from the v1.6 design): fully settled
 * (outstanding <= 0) is Paid — Paid always wins, even past the due
 * date. Otherwise a due date in the past makes the load Overdue; a
 * part-payment without a passed due date is Partially paid; the rest
 * is Unpaid. A due date of today is NOT overdue (only strictly past
 * dates count). `today` defaults to the current date and is a
 * parameter so tests can pin it.
 */
export function loadStatus(
  load: LoadRow,
  payments: LoadPaymentRow[],
  today: string = new Date().toISOString().slice(0, 10)
): LoadStatus {
  const paid = paidFor(load.id, payments);
  if (outstandingFor(load, payments) <= 0) return "paid";
  if (load.due_on && load.due_on < today) return "overdue";
  if (paid > 0) return "partial";
  return "unpaid";
}

/**
 * Validate a new payment amount (minor units) against a load.
 * Returns null when the payment is acceptable, otherwise the failure:
 * "invalidAmount" (zero/negative/non-finite) or "overpayment" (more than
 * the outstanding balance). The database guard in migration 0008 enforces
 * the same rules server-side; this is the UI-side check.
 */
export function validatePayment(
  load: LoadRow,
  payments: LoadPaymentRow[],
  amountMinor: number
): "invalidAmount" | "overpayment" | null {
  if (!Number.isFinite(amountMinor) || amountMinor <= 0) {
    return "invalidAmount";
  }
  if (amountMinor > outstandingFor(load, payments)) return "overpayment";
  return null;
}

export interface CurrencySummary {
  currency: Currency;
  /** Recognized income for the month (minor units). */
  income: number;
  /** Business spending incurred in the month (minor units). */
  spending: number;
  /** income − spending (minor units). */
  profit: number;
  /** Outstanding balances across ALL loads, any month (minor units). */
  outstanding: number;
}

export type ProfitMethod = "delivery" | "cash";

/**
 * Per-currency monthly summary, one entry per currency (CAD, USD).
 * Delivery method: income = net revenue of loads DELIVERED in the month.
 * Cash method: income = payments RECEIVED in the month. Expenses are
 * always counted by incurred month. Outstanding is month-independent.
 */
export function monthSummary(
  month: string,
  expenses: ExpenseLike[],
  loads: LoadRow[],
  payments: LoadPaymentRow[],
  method: ProfitMethod
): CurrencySummary[] {
  return CURRENCIES.map((currency) => {
    const income =
      method === "delivery"
        ? loads
            .filter(
              (l) =>
                asCurrency(l.currency) === currency &&
                monthOf(l.delivery_date) === month
            )
            .reduce((s, l) => s + netLoad(l), 0)
        : payments
            .filter(
              (p) =>
                asCurrency(p.currency) === currency &&
                monthOf(p.paid_on) === month
            )
            .reduce((s, p) => s + p.amount_minor, 0);
    const spending = expenses
      .filter(
        (e) =>
          asCurrency(e.currency) === currency &&
          monthOf(e.expense_date) === month
      )
      .reduce((s, e) => s + e.amountMinor, 0);
    const outstanding = loads
      .filter((l) => asCurrency(l.currency) === currency)
      .reduce((s, l) => s + outstandingFor(l, payments), 0);
    return { currency, income, spending, profit: income - spending, outstanding };
  });
}

/** Format integer minor units as money (e.g. $1,234.56 / 1 234,56 $). */
export function money(
  minor: number,
  currency: Currency,
  locale = "en-CA"
): string {
  return (minor / 100).toLocaleString(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export interface PerMile {
  currency: Currency;
  /** Total trip miles of loads delivered in the month. */
  miles: number;
  /** Dollars per mile; null when the month has no miles. */
  revenuePerMile: number | null;
  costPerMile: number | null;
  profitPerMile: number | null;
}

/**
 * Per-mile operating estimate (v1.4, ported from the v1.6 formula,
 * adapted to the live schema). Delivery basis only: loads delivered in
 * the month for the currency, revenue = their net, cost = expenses
 * incurred in the month for the currency. NOTE: the live app has NO
 * business/personal flag on expenses, so ALL expenses count as cost —
 * the same assumption monthSummary already makes. This is a simplified
 * aggregate estimate, not a per-load allocation. All three rates are
 * null when miles is 0 (no division by zero, no misleading $0.00).
 */
export function profitPerMile(
  month: string,
  expenses: ExpenseLike[],
  loads: LoadRow[],
  currency: Currency
): PerMile {
  const selected = loads.filter(
    (l) =>
      asCurrency(l.currency) === currency && monthOf(l.delivery_date) === month
  );
  const miles = selected.reduce((s, l) => s + (l.distance_miles ?? 0), 0);
  const revenue = selected.reduce((s, l) => s + netLoad(l), 0);
  const cost = expenses
    .filter(
      (e) =>
        asCurrency(e.currency) === currency && monthOf(e.expense_date) === month
    )
    .reduce((s, e) => s + e.amountMinor, 0);
  return {
    currency,
    miles,
    revenuePerMile: miles ? revenue / 100 / miles : null,
    costPerMile: miles ? cost / 100 / miles : null,
    profitPerMile: miles ? (revenue - cost) / 100 / miles : null,
  };
}
