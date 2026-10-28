-- 0009: Mileage + accountant access for MileMoney v1.4. ADDITIVE ONLY.
--
-- Loads gain optional trip miles + payment due date; a new
-- accountant_access table holds owner-granted read-only access.
-- Nothing existing is altered, dropped, or renamed, and no existing
-- row is changed. Apply in the Supabase project's SQL Editor after 0008.

alter table public.loads
  add column if not exists distance_miles numeric(12, 2)
    check (distance_miles >= 0);

alter table public.loads
  add column if not exists due_on date;

create table if not exists public.accountant_access (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  accountant_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'active'
    check (status in ('active', 'revoked')),
  created_at timestamptz not null default now(),
  unique (owner_id, accountant_id),
  check (owner_id <> accountant_id)
);

create index if not exists accountant_access_accountant_idx
  on public.accountant_access (accountant_id, status);

alter table public.accountant_access enable row level security;

create policy "Owners manage their own accountant access"
  on public.accountant_access
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Accountants see their own grants"
  on public.accountant_access
  for select
  using (auth.uid() = accountant_id);

-- Read-only accountant access to the owner's finance rows. Owner write
-- policies are untouched. Storage stays owner-only (no accountant
-- storage policy) — receipt photos are never shared.
create policy "Accountants read granted expenses"
  on public.personal_expenses
  for select
  using (exists (
    select 1 from public.accountant_access a
    where a.owner_id = personal_expenses.user_id
      and a.accountant_id = auth.uid()
      and a.status = 'active'
  ));

create policy "Accountants read granted loads"
  on public.loads
  for select
  using (exists (
    select 1 from public.accountant_access a
    where a.owner_id = loads.user_id
      and a.accountant_id = auth.uid()
      and a.status = 'active'
  ));

create policy "Accountants read granted payments"
  on public.load_payments
  for select
  using (exists (
    select 1 from public.accountant_access a
    where a.owner_id = load_payments.user_id
      and a.accountant_id = auth.uid()
      and a.status = 'active'
  ));
