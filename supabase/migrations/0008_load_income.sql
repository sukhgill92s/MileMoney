-- 0008: Load income for MileMoney v1.1. ADDITIVE ONLY.
--
-- New tables loads + load_payments for driver / owner-operator load
-- income, plus a currency column on personal_expenses (default CAD, so
-- every existing row stays CAD and per-currency profit is real).
-- Nothing existing is altered, dropped, or renamed. personal_expenses
-- keeps its name, its RLS policy, and its receipt storage policy.
--
-- Run in the Supabase project's SQL Editor after 0007.

alter table public.personal_expenses
  add column if not exists currency text not null default 'CAD'
  check (currency in ('CAD', 'USD'));

-- Load amounts are integer minor units (cents), matching the v1.1 finance
-- module: gross + surcharge + accessorials - deductions = net revenue.
create table public.loads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  reference text not null,
  counterparty text not null default '',
  pickup_date date,
  delivery_date date not null,
  currency text not null check (currency in ('CAD', 'USD')),
  gross_minor bigint not null default 0 check (gross_minor >= 0),
  surcharge_minor bigint not null default 0 check (surcharge_minor >= 0),
  accessorial_minor bigint not null default 0 check (accessorial_minor >= 0),
  deductions_minor bigint not null default 0 check (deductions_minor >= 0),
  notes text,
  created_at timestamptz not null default now()
);

create index loads_user_delivery_idx
  on public.loads (user_id, delivery_date desc);

create table public.load_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  load_id uuid not null references public.loads (id) on delete cascade,
  paid_on date not null,
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null check (currency in ('CAD', 'USD')),
  memo text,
  created_at timestamptz not null default now()
);

create index load_payments_user_date_idx
  on public.load_payments (user_id, paid_on desc);

alter table public.loads enable row level security;
alter table public.load_payments enable row level security;

create policy "Users manage only their own loads"
  on public.loads
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage only their own load payments"
  on public.load_payments
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Guard, enforced on every payment insert/update: the payment must belong
-- to the payer's own load, match the load's currency, and never exceed
-- the load's outstanding balance. The UI validates the same rules first;
-- this is the server-side backstop.
create or replace function public.check_load_payment()
  returns trigger language plpgsql security invoker as $$
declare
  load_owner uuid;
  load_currency text;
  load_net bigint;
  already_paid bigint;
begin
  select user_id, currency,
    gross_minor + surcharge_minor + accessorial_minor - deductions_minor
    into load_owner, load_currency, load_net
    from public.loads where id = new.load_id;
  if load_owner is null then
    raise exception 'Load not found';
  end if;
  if load_owner <> new.user_id then
    raise exception 'Invalid load owner';
  end if;
  if new.currency <> load_currency then
    raise exception 'Payment currency mismatch';
  end if;
  select coalesce(sum(amount_minor), 0) into already_paid
    from public.load_payments
    where load_id = new.load_id and id <> new.id;
  if new.amount_minor > load_net - already_paid then
    raise exception 'Payment exceeds outstanding balance';
  end if;
  return new;
end;
$$;

create trigger load_payments_guard
  before insert or update on public.load_payments
  for each row execute function public.check_load_payment();
