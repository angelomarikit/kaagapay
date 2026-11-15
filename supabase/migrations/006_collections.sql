-- 006: daily collections POS
-- Safe to re-run: uses IF NOT EXISTS (skip if you already ran an older 006 without this)

create table if not exists public.collection_transactions (
  id uuid primary key default gen_random_uuid(),
  receipt_number text unique,
  dispatch_id uuid references public.dispatches (id),
  vehicle_id uuid references public.vehicles (id),
  driver_id uuid references public.drivers (id),
  subtotal numeric(18, 2) not null default 0,
  discount_amount numeric(18, 2) not null default 0,
  total_amount numeric(18, 2) not null,
  amount_tendered numeric(18, 2),
  change_amount numeric(18, 2),
  payment_method text not null default 'cash',
  payment_reference text,
  payment_proof_url text,
  verification_status text not null default 'confirmed',
  status text not null default 'draft',
  client_request_id uuid not null,
  collected_by uuid references public.profiles (id),
  collected_at timestamptz not null default now(),
  journal_entry_id uuid,
  unique (client_request_id)
);

create table if not exists public.collection_items (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.collection_transactions (id) on delete cascade,
  item_type text not null,
  description text,
  unit_price numeric(18, 2) not null,
  quantity numeric(12, 3) not null,
  line_total numeric(18, 2) generated always as (unit_price * quantity) stored
);

create table if not exists public.fare_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  unit_price numeric(18, 2) not null,
  is_active boolean not null default true
);