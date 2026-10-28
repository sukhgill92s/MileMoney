/** Pure CSV builder for the monthly expenses export (v1.3). No imports,
 * no I/O — the route handler maps database rows to CsvExpenseRow with
 * already-localized labels, so this file stays testable standalone. */

export interface CsvExpenseRow {
  date: string;
  category: string;
  amount: string;
  currency: string;
  note: string;
  receipt: string;
}

/** Quote a field only when it needs it (comma, quote, or line break). */
export function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/** Header row + one row per expense, LF line endings, trailing newline. */
export function buildExpenseCsv(
  headers: string[],
  rows: CsvExpenseRow[]
): string {
  const lines = [headers.map(csvEscape).join(",")];
  for (const r of rows) {
    lines.push(
      [r.date, r.category, r.amount, r.currency, r.note, r.receipt]
        .map(csvEscape)
        .join(",")
    );
  }
  return lines.join("\n") + "\n";
}
