/**
 * Unit tests for lib/finance.ts. Node built-in test runner only — no new
 * test framework. Run with: npm test
 * (compiles this file + finance.ts to /tmp and runs node --test on it).
 */
import { test } from "node:test";
import * as assert from "node:assert/strict";
import {
  asCurrency,
  fromMinor,
  loadStatus,
  profitPerMile,
  money,
  monthOf,
  monthSummary,
  netLoad,
  outstandingFor,
  paidFor,
  toMinor,
  validatePayment,
  type ExpenseLike,
  type LoadPaymentRow,
  type LoadRow,
} from "./finance";

function load(over: Partial<LoadRow> = {}): LoadRow {
  return {
    id: "load-1",
    user_id: "user-1",
    reference: "LOAD-1042",
    counterparty: "Carrier Co",
    pickup_date: "2026-10-01",
    delivery_date: "2026-10-05",
    currency: "CAD",
    gross_minor: 100000,
    surcharge_minor: 15000,
    accessorial_minor: 5000,
    deductions_minor: 10000,
    notes: null,
    created_at: "2026-10-05T00:00:00Z",
    ...over,
  };
}

function payment(over: Partial<LoadPaymentRow> = {}): LoadPaymentRow {
  return {
    id: "pay-1",
    user_id: "user-1",
    load_id: "load-1",
    paid_on: "2026-10-10",
    amount_minor: 50000,
    currency: "CAD",
    memo: null,
    created_at: "2026-10-10T00:00:00Z",
    ...over,
  };
}

test("toMinor/fromMinor round-trip dollars and cents", () => {
  assert.equal(toMinor(12.34), 1234);
  assert.equal(toMinor(19.99), 1999);
  assert.equal(toMinor(0), 0);
  assert.equal(fromMinor(1234), 12.34);
  assert.equal(toMinor(Number.NaN), 0);
});

test("netLoad = gross + surcharge + accessorials − deductions", () => {
  assert.equal(netLoad(load()), 110000);
  assert.equal(netLoad(load({ deductions_minor: 120000 })), 0);
});

test("paidFor sums only the load's own payments", () => {
  const payments = [
    payment({ amount_minor: 50000 }),
    payment({ id: "pay-2", amount_minor: 20000 }),
    payment({ id: "pay-3", load_id: "other-load", amount_minor: 99999 }),
  ];
  assert.equal(paidFor("load-1", payments), 70000);
});

test("outstandingFor never goes below zero", () => {
  const l = load();
  assert.equal(outstandingFor(l, []), 110000);
  assert.equal(outstandingFor(l, [payment({ amount_minor: 50000 })]), 60000);
  assert.equal(
    outstandingFor(l, [payment({ amount_minor: 200000 })]),
    0
  );
});

test("loadStatus: unpaid, partial, paid", () => {
  const l = load();
  assert.equal(loadStatus(l, []), "unpaid");
  assert.equal(loadStatus(l, [payment({ amount_minor: 1 })]), "partial");
  assert.equal(loadStatus(l, [payment({ amount_minor: 110000 })]), "paid");
  assert.equal(loadStatus(l, [payment({ amount_minor: 200000 })]), "paid");
});

test("validatePayment rejects invalid and overpaid amounts", () => {
  const l = load();
  const payments = [payment({ amount_minor: 50000 })]; // 60000 left
  assert.equal(validatePayment(l, payments, 0), "invalidAmount");
  assert.equal(validatePayment(l, payments, -100), "invalidAmount");
  assert.equal(validatePayment(l, payments, 60001), "overpayment");
  assert.equal(validatePayment(l, payments, 60000), null);
  assert.equal(validatePayment(l, payments, 1), null);
});

test("monthSummary delivery method, per currency, never summed", () => {
  const loads = [
    load(), // CAD, delivered Oct, net 110000
    load({
      id: "load-2",
      currency: "USD",
      delivery_date: "2026-10-07",
      gross_minor: 50000,
      surcharge_minor: 0,
      accessorial_minor: 0,
      deductions_minor: 0,
    }), // USD, delivered Oct, net 50000
    load({
      id: "load-3",
      delivery_date: "2026-09-20",
      gross_minor: 99999,
      surcharge_minor: 0,
      accessorial_minor: 0,
      deductions_minor: 0,
    }), // CAD, delivered Sep — excluded from Oct income
  ];
  const expenses: ExpenseLike[] = [
    { expense_date: "2026-10-03", amountMinor: 730000, currency: "CAD" },
    { expense_date: "2026-09-15", amountMinor: 11100, currency: "CAD" },
  ];
  const payments = [payment({ amount_minor: 50000, paid_on: "2026-10-10" })];
  const [cad, usd] = monthSummary("2026-10", expenses, loads, payments, "delivery");
  assert.equal(cad.currency, "CAD");
  assert.equal(cad.income, 110000);
  assert.equal(cad.spending, 730000);
  assert.equal(cad.profit, 110000 - 730000);
  // Outstanding spans all months: Oct load 60000 left + Sep load 99999 left.
  assert.equal(cad.outstanding, 60000 + 99999);
  assert.equal(usd.currency, "USD");
  assert.equal(usd.income, 50000);
  assert.equal(usd.spending, 0);
  assert.equal(usd.profit, 50000);
  assert.equal(usd.outstanding, 50000);
});

test("monthSummary cash method counts payments received in month", () => {
  const loads = [load()]; // delivered Oct, net 110000
  const payments = [
    payment({ amount_minor: 50000, paid_on: "2026-10-10" }),
    payment({ id: "pay-2", amount_minor: 10000, paid_on: "2026-11-02" }),
  ];
  const [cad] = monthSummary("2026-10", [], loads, payments, "cash");
  assert.equal(cad.income, 50000); // only the October payment
  assert.equal(cad.outstanding, 110000 - 60000);
  const [cadNov] = monthSummary("2026-11", [], loads, payments, "cash");
  assert.equal(cadNov.income, 10000);
});

test("asCurrency defaults unknown values to CAD", () => {
  assert.equal(asCurrency("USD"), "USD");
  assert.equal(asCurrency("CAD"), "CAD");
  assert.equal(asCurrency(null), "CAD");
  assert.equal(asCurrency(undefined), "CAD");
  assert.equal(asCurrency("EUR"), "CAD");
});

test("monthOf slices YYYY-MM", () => {
  assert.equal(monthOf("2026-10-05"), "2026-10");
});

test("money formats per currency", () => {
  assert.ok(money(110000, "CAD", "en-CA").includes("1,100.00"));
  assert.ok(money(50000, "USD", "en-CA").includes("500.00"));
});

test("loadStatus: overdue beats partial/unpaid, paid beats overdue", () => {
  const today = "2026-10-28";
  const pastDue = load({ due_on: "2026-10-20" });
  assert.equal(loadStatus(pastDue, [], today), "overdue");
  assert.equal(
    loadStatus(pastDue, [payment({ amount_minor: 50000 })], today),
    "overdue"
  );
  assert.equal(
    loadStatus(pastDue, [payment({ amount_minor: 110000 })], today),
    "paid"
  );
  // Due today is NOT overdue.
  const dueToday = load({ due_on: "2026-10-28" });
  assert.equal(loadStatus(dueToday, [], today), "unpaid");
  assert.equal(
    loadStatus(dueToday, [payment({ amount_minor: 50000 })], today),
    "partial"
  );
  // No due date at all: old three-state behaviour is preserved.
  assert.equal(loadStatus(load(), [], today), "unpaid");
});

test("profitPerMile: normal case, per-currency and per-month filtering", () => {
  const loads = [
    load({ delivery_date: "2026-10-05", distance_miles: 1000 }),
    load({
      id: "load-2",
      delivery_date: "2026-10-20",
      distance_miles: 250,
      gross_minor: 50000,
      surcharge_minor: 0,
      accessorial_minor: 0,
      deductions_minor: 0,
    }),
    load({ id: "load-3", delivery_date: "2026-11-01", distance_miles: 999 }),
    load({
      id: "load-4",
      delivery_date: "2026-10-10",
      currency: "USD",
      distance_miles: 500,
    }),
  ];
  const expenses = [
    { expense_date: "2026-10-03", amountMinor: 20000, currency: "CAD" },
    { expense_date: "2026-11-03", amountMinor: 99900, currency: "CAD" },
  ];
  const r = profitPerMile("2026-10", expenses, loads, "CAD");
  assert.equal(r.miles, 1250);
  // Revenue: 110000 + 50000 = 160000 minor = $1600 -> $1.28/mile.
  assert.equal(r.revenuePerMile, 1600 / 1250);
  assert.equal(r.costPerMile, 200 / 1250);
  assert.equal(r.profitPerMile, 1400 / 1250);
  const usd = profitPerMile("2026-10", expenses, loads, "USD");
  assert.equal(usd.miles, 500);
  const empty = profitPerMile("2026-12", expenses, loads, "CAD");
  assert.equal(empty.miles, 0);
  assert.equal(empty.revenuePerMile, null);
  assert.equal(empty.costPerMile, null);
  assert.equal(empty.profitPerMile, null);
});

test("profitPerMile: loads without miles yield nulls, not zeros", () => {
  const r = profitPerMile("2026-10", [], [load()], "CAD");
  assert.equal(r.miles, 0);
  assert.equal(r.profitPerMile, null);
});
