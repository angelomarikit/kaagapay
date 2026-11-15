-- 007: accounting
create table public.chart_of_accounts (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  account_type text not null,
  parent_id uuid references public.chart_of_accounts (id),
  is_active boolean not null default true
);

create table public.cash_bank_accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  account_type text not null,
  gl_account_id uuid references public.chart_of_accounts (id),
  current_balance numeric(18, 2) not null default 0
);

create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  reference text not null,
  description text,
  entry_date date not null default current_date,
  status text not null default 'draft',
  source_type text,
  source_id uuid,
  posted_by uuid references public.profiles (id),
  posted_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.journal_lines (
  id uuid primary key default gen_random_uuid(),
  journal_entry_id uuid not null references public.journal_entries (id) on delete cascade,
  account_id uuid not null references public.chart_of_accounts (id),
  description text,
  debit numeric(18, 2) not null default 0 check (debit >= 0),
  credit numeric(18, 2) not null default 0 check (credit >= 0),
  check (not (debit > 0 and credit > 0))
);

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_info text
);

create table public.accounts_payable (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid references public.suppliers (id),
  reference text not null,
  description text,
  amount numeric(18, 2) not null,
  amount_paid numeric(18, 2) not null default 0,
  due_date date,
  status text not null default 'open',
  journal_entry_id uuid
);

create table public.accounts_receivable (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references public.members (id),
  loan_id uuid,
  reference text not null,
  description text,
  amount numeric(18, 2) not null,
  amount_paid numeric(18, 2) not null default 0,
  due_date date,
  status text not null default 'open',
  journal_entry_id uuid
);

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  period_start date not null,
  period_end date not null,
  department text,
  category text,
  budget_amount numeric(18, 2) not null,
  actual_amount numeric(18, 2) not null default 0
);