-- 009: payroll, inventory, documents
create table public.employees (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  position text,
  basic_salary numeric(18, 2),
  status text not null default 'active',
  user_id uuid references public.profiles (id)
);

create table public.payroll_runs (
  id uuid primary key default gen_random_uuid(),
  period_start date not null,
  period_end date not null,
  status text not null default 'draft',
  total_gross numeric(18, 2) not null default 0,
  total_deductions numeric(18, 2) not null default 0,
  total_net numeric(18, 2) not null default 0,
  journal_entry_id uuid,
  approved_at timestamptz
);

create table public.payroll_items (
  id uuid primary key default gen_random_uuid(),
  payroll_run_id uuid not null references public.payroll_runs (id) on delete cascade,
  employee_id uuid not null references public.employees (id),
  gross_pay numeric(18, 2) not null,
  deductions numeric(18, 2) not null default 0,
  net_pay numeric(18, 2) not null
);

create table public.inventory_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  category_id uuid references public.inventory_categories (id),
  unit_cost numeric(18, 2) not null default 0,
  quantity_on_hand numeric(18, 3) not null default 0,
  reorder_level numeric(18, 3) not null default 0
);

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.inventory_items (id),
  movement_type text not null,
  quantity numeric(18, 3) not null,
  unit_cost numeric(18, 2),
  reference text,
  maintenance_id uuid references public.maintenance_records (id),
  created_at timestamptz not null default now()
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  title text not null,
  storage_path text not null,
  linked_table text,
  linked_id uuid,
  expires_on date,
  uploaded_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);