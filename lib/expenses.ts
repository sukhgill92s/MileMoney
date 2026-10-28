/** Shared helpers for the single-user expense tracker. */

import type { StringKey } from "@/lib/strings";

export const CATEGORIES = [
  { value: "diesel", label: "Diesel" },
  { value: "repair", label: "Repair" },
  { value: "toll", label: "Toll" },
  { value: "food", label: "Food" },
  { value: "other", label: "Other" },
] as const;

export type Category = (typeof CATEGORIES)[number]["value"];

export interface PersonalExpense {
  id: string;
  user_id: string;
  expense_date: string; // YYYY-MM-DD
  category: string;
  amount_cad: number;
  note: string | null;
  receipt_path: string | null;
  created_at: string;
}

/** "2026-10" for a Date (local time). */
export function monthKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** First and last day (YYYY-MM-DD) of a "YYYY-MM" month. */
export function monthRange(month: string): { start: string; end: string } {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const last = new Date(y, m, 0);
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
  return { start: iso(first), end: iso(last) };
}

/** "2026-10" -> "October 2026" (or "octobre 2026" for fr-CA). */
export function monthLabel(month: string, locale = "en-CA"): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
  });
}

/** Map a stored category value to its strings key (see lib/strings.ts). */
export function categoryLabelKey(value: string): StringKey {
  switch (value) {
    case "diesel":
      return "catDiesel";
    case "repair":
      return "catRepair";
    case "toll":
      return "catToll";
    case "food":
      return "catFood";
    default:
      return "catOther";
  }
}

/** Shift a "YYYY-MM" month by delta months (negative = earlier). */
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return monthKey(d);
}

/** True for a "YYYY-MM" string. */
export function isMonth(value: string): boolean {
  if (!/^\d{4}-\d{2}$/.test(value)) return false;
  const m = Number(value.slice(5, 7));
  return m >= 1 && m <= 12;
}
