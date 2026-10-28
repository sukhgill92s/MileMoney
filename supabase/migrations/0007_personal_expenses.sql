-- 0007: Personal expenses for the single-user expense tracker pivot.
--
-- Clean pivot (Oct 2026): dispatch / trips / drivers UI is removed. The old
-- company tables (drivers, trucks, trips, expenses) are LEFT UNTOUCHED by
-- this migration — no alter, no drop, no data change. This new table is
-- keyed directly to auth.users, so one driver / owner-operator tracks their
-- own daily expenses without any company or driver record.
--
-- Run in the Supabase project's SQL Editor after 0006.

create table public.personal_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  expense_date date not null,
  category text not null
    check (category in ('diesel', 'repair', 'toll', 'food', 'other')),
  amount_cad numeric not null check (amount_cad > 0),
  note text,
  receipt_path text,
  created_at timestamptz not null default now()
);

create index personal_expenses_user_date_idx
  on public.personal_expenses (user_id, expense_date desc);

alter table public.personal_expenses enable row level security;

create policy "Users manage only their own personal expenses"
  on public.personal_expenses
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Personal receipt photos live in the existing private "receipts" bucket at
-- receipts/personal/{user_id}/{file}. This policy is additive only; the
-- existing company receipt policies are untouched.
create policy "Users manage their personal receipts"
  on storage.objects
  for all
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = 'personal'
    and (storage.foldername(name))[2] = auth.uid()::text
  )
  with check (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = 'personal'
    and (storage.foldername(name))[2] = auth.uid()::text
  );
