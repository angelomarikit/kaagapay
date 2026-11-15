-- 004: transport and fleet
create table public.routes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  origin text,
  destination text,
  distance_km numeric(10, 2),
  is_active boolean not null default true
);

create table public.drivers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  license_number text,
  contact_number text,
  status text not null default 'available',
  member_id uuid references public.members (id)
);

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  plate_number text not null unique,
  unit_number text,
  vehicle_type text,
  model text,
  capacity int,
  assigned_driver_id uuid references public.drivers (id),
  route_id uuid references public.routes (id),
  status text not null default 'available',
  created_at timestamptz not null default now()
);

create table public.maintenance_records (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id),
  maintenance_type text not null,
  status text not null default 'scheduled',
  service_provider text,
  labor_cost numeric(18, 2) default 0,
  parts_cost numeric(18, 2) default 0,
  total_cost numeric(18, 2) generated always as (coalesce(labor_cost, 0) + coalesce(parts_cost, 0)) stored,
  odometer_reading numeric(12, 2),
  scheduled_at timestamptz,
  completed_at timestamptz,
  notes text,
  journal_entry_id uuid,
  created_at timestamptz not null default now()
);

create table public.fuel_transactions (
  id uuid primary key default gen_random_uuid(),
  reference_number text not null unique,
  vehicle_id uuid not null references public.vehicles (id),
  dispatch_id uuid,
  fuel_type text not null,
  quantity_liters numeric(12, 3) not null,
  unit_price numeric(18, 4) not null,
  total_cost numeric(18, 2) generated always as (quantity_liters * unit_price) stored,
  odometer_reading numeric(12, 2),
  fuel_station text,
  transaction_date date not null default current_date,
  journal_entry_id uuid
);

create table public.operating_expenses (
  id uuid primary key default gen_random_uuid(),
  reference_number text not null unique,
  vehicle_id uuid references public.vehicles (id),
  expense_category text not null,
  description text,
  amount numeric(18, 2) not null,
  expense_date date not null default current_date,
  journal_entry_id uuid
);