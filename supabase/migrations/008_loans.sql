-- 008: loans
create table public.loan_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  interest_method text not null default 'declining_balance',
  default_rate numeric(8, 4) not null,
  default_term_months int not null,
  is_active boolean not null default true
);

create table public.loan_applications (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id),
  loan_type_id uuid references public.loan_types (id),
  requested_principal numeric(18, 2) not null,
  purpose text,
  term_months int not null,
  interest_rate numeric(8, 4) not null,
  status text not null default 'submitted',
  rejection_reason text,
  created_at timestamptz not null default now()
);

create table public.loans (
  id uuid primary key default gen_random_uuid(),
  loan_number text not null unique,
  application_id uuid references public.loan_applications (id),
  member_id uuid not null references public.members (id),
  principal numeric(18, 2) not null,
  interest_rate numeric(8, 4) not null,
  term_months int not null,
  outstanding_principal numeric(18, 2) not null,
  status text not null default 'active',
  disbursed_at timestamptz,
  disbursement_journal_id uuid
);

create table public.loan_schedules (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.loans (id) on delete cascade,
  payment_no int not null,
  due_date date not null,
  amount_due numeric(18, 2) not null,
  principal_portion numeric(18, 2) not null,
  interest_portion numeric(18, 2) not null,
  amount_paid numeric(18, 2) not null default 0,
  status text not null default 'upcoming',
  unique (loan_id, payment_no)
);

create table public.loan_repayments (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.loans (id),
  amount numeric(18, 2) not null,
  principal_paid numeric(18, 2) not null default 0,
  interest_paid numeric(18, 2) not null default 0,
  client_request_id uuid not null unique,
  paid_at timestamptz not null default now(),
  journal_entry_id uuid,
  receipt_reference text
);