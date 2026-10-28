/**
 * Unit tests for lib/monthlyCsv.ts. Node built-in test runner only — no
 * new test framework. Run with: npm test
 * (compiled together with the finance suite to /tmp and run by node --test).
 */
import { test } from "node:test";
import * as assert from "node:assert/strict";
import {
  buildExpenseCsv,
  csvEscape,
  type CsvExpenseRow,
} from "./monthlyCsv";

const HEADERS = ["date", "category", "amount", "currency", "note", "receipt"];

function row(over: Partial<CsvExpenseRow> = {}): CsvExpenseRow {
  return {
    date: "2026-10-28",
    category: "Diesel",
    amount: "120.50",
    currency: "CAD",
    note: "Petro-Canada",
    receipt: "yes",
    ...over,
  };
}

test("csvEscape quotes only when needed", () => {
  assert.equal(csvEscape("plain"), "plain");
  assert.equal(csvEscape("has, comma"), '"has, comma"');
  assert.equal(csvEscape('has "quote"'), '"has ""quote"""');
  assert.equal(csvEscape("two\nlines"), '"two\nlines"');
});

test("buildExpenseCsv emits header + rows with escaping", () => {
  const csv = buildExpenseCsv(HEADERS, [
    row(),
    row({ note: 'Tire shop, "big" job', receipt: "no" }),
  ]);
  const lines = csv.split("\n");
  assert.equal(lines[0], "date,category,amount,currency,note,receipt");
  assert.equal(
    lines[1],
    "2026-10-28,Diesel,120.50,CAD,Petro-Canada,yes"
  );
  assert.equal(
    lines[2],
    '2026-10-28,Diesel,120.50,CAD,"Tire shop, ""big"" job",no'
  );
  assert.equal(lines[3], "");
});

test("buildExpenseCsv with no rows is just the header", () => {
  assert.equal(
    buildExpenseCsv(HEADERS, []),
    "date,category,amount,currency,note,receipt\n"
  );
});
