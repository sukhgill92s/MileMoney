# MileMoney — Driver Expense Tracker

Single-user expense tracker for drivers and owner-operators.
Live: https://mile.driverdays.ca

Formerly the FleetDesk dispatch app — clean pivot in Oct 2026: dispatch,
trips, drivers, and payroll routes were removed entirely.

## Features

- Dashboard: month selector, month total, category cards
  (Diesel, Repair, Toll, Food, Other), month expense list, empty state
- Add expense: date, category, amount (CAD), note, receipt photo
- Scan Receipt: free on-device OCR (tesseract.js) + smart vendor/category
  detection, editable review screen — no paid API, no keys
- Monthly PDF: server-generated, in English or French
  (`/api/monthly-pdf?month=YYYY-MM&lang=en|fr`)
- Language toggle: French + English only, full UI + PDF

## Routes

`/`, `/dashboard`, `/expenses/new`, `/login`, `/signup`,
`/api/monthly-pdf`, `/auth/*`

## Stack

Next.js + Supabase. Data lives in `public.personal_expenses`
(user-scoped RLS, own rows only); receipt photos in the private
`receipts` bucket under `personal/{user_id}/`.

Apply `supabase/migrations/0007_personal_expenses.sql` for the schema.
Old dispatch tables (drivers, trucks, trips, expenses, profiles) are gone.
