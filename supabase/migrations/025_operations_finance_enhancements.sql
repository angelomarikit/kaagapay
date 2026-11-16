-- 025: POS products, loan schedules, schema extensions, inventory RPC

-- POS sellable products (replaces fare-only POS catalog)
create table if not exists public.pos_products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  unit_price numeric(18, 2) not null,
  is_active boolean not null default true,
  is_default boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.pos_products enable row level security;

drop policy if exists staff_pos_products on public.pos_products;
create policy staff_pos_products on public.pos_products for all
  using (public.is_staff()) with check (public.is_staff());

drop policy if exists pos_products_active_read on public.pos_products;
create policy pos_products_active_read on public.pos_products for select
  using (is_active = true or public.is_staff());

-- POS catalog starts empty; staff add products from Daily Collections UI.

alter table public.operating_expenses
  add column if not exists odometer_reading numeric(12, 2);

alter table public.employees add column if not exists contact_number text;
alter table public.employees add column if not exists email text;
alter table public.employees add column if not exists benefits text;
alter table public.employees add column if not exists hire_date date;
alter table public.employees add column if not exists department text;

alter table public.documents add column if not exists cabinet_location text;

alter table public.loans add column if not exists first_due_date date;

update public.loan_types set name = 'Regular Loan', default_rate = 12.0, default_term_months = 24
  where name ilike '%working%capital%' or name = 'Working Capital';
update public.loan_types set name = 'Product Loan', default_rate = 8.0, default_term_months = 36
  where name ilike '%vehicle%' or name = 'Vehicle Financing';

insert into public.loan_types (name, default_rate, default_term_months)
select 'Regular Loan', 12.0, 24
where not exists (select 1 from public.loan_types where name = 'Regular Loan');

insert into public.loan_types (name, default_rate, default_term_months)
select 'Product Loan', 8.0, 36
where not exists (select 1 from public.loan_types where name = 'Product Loan');

create or replace function public.approve_loan_application(application_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  app public.loan_applications%rowtype;
  loan_id uuid;
  loan_no text;
  disbursed date := current_date;
  monthly_principal numeric(18, 2);
  remaining numeric(18, 2);
  interest_p numeric(18, 2);
  monthly_rate numeric;
  due_d date;
  first_due date;
  i int;
begin
  if not public.is_staff() then raise exception 'Unauthorized'; end if;

  select * into app from public.loan_applications where id = application_id for update;
  if not found then raise exception 'Application not found'; end if;
  if app.status = 'approved' then
    select id, loan_number into loan_id, loan_no from public.loans where application_id = application_id limit 1;
    return jsonb_build_object('loan_id', loan_id, 'loan_number', loan_no, 'idempotent', true);
  end if;
  if app.status not in ('submitted', 'pending', 'under_review') then
    raise exception 'Application cannot be approved from status %', app.status;
  end if;

  loan_no := 'LN-' || to_char(now(), 'YYYY') || '-' || lpad((select count(*) + 1 from public.loans)::text, 4, '0');
  monthly_principal := round(app.requested_principal / app.term_months, 2);
  remaining := app.requested_principal;
  monthly_rate := app.interest_rate / 100.0 / 12.0;
  first_due := (disbursed + interval '1 month')::date;

  insert into public.loans (
    loan_number, application_id, member_id, principal, interest_rate, term_months,
    outstanding_principal, status, disbursed_at, first_due_date
  ) values (
    loan_no, app.id, app.member_id, app.requested_principal, app.interest_rate, app.term_months,
    app.requested_principal, 'active', now(), first_due
  ) returning id into loan_id;

  for i in 1..app.term_months loop
    interest_p := round(remaining * monthly_rate, 2);
    due_d := (disbursed + (i || ' months')::interval)::date;
    insert into public.loan_schedules (
      loan_id, payment_no, due_date, amount_due, principal_portion, interest_portion, status
    ) values (
      loan_id,
      i,
      due_d,
      monthly_principal + interest_p,
      monthly_principal,
      interest_p,
      case when i = 1 then 'due' else 'upcoming' end
    );
    remaining := greatest(remaining - monthly_principal, 0);
  end loop;

  update public.loan_applications set status = 'approved' where id = application_id;

  return jsonb_build_object('loan_id', loan_id, 'loan_number', loan_no, 'first_due_date', first_due);
end;
$$;

create or replace function public.post_inventory_movement(
  p_item_id uuid,
  p_movement_type text,
  p_quantity numeric,
  p_reference text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  item_row public.inventory_items%rowtype;
  delta numeric;
  next_qty numeric;
begin
  if not public.is_staff() then raise exception 'Unauthorized'; end if;
  if p_movement_type not in ('receive', 'issue') then raise exception 'Invalid movement type'; end if;
  if p_quantity is null or p_quantity <= 0 then raise exception 'Quantity must be positive'; end if;

  select * into item_row from public.inventory_items where id = p_item_id for update;
  if not found then raise exception 'Item not found'; end if;

  delta := case when p_movement_type = 'receive' then p_quantity else -p_quantity end;
  next_qty := item_row.quantity_on_hand + delta;
  if next_qty < 0 then raise exception 'Insufficient stock'; end if;

  insert into public.inventory_movements (item_id, movement_type, quantity, unit_cost, reference)
  values (p_item_id, p_movement_type, p_quantity, item_row.unit_cost, coalesce(p_reference, p_movement_type));

  update public.inventory_items set quantity_on_hand = next_qty where id = p_item_id;

  return jsonb_build_object('item_id', p_item_id, 'quantity_on_hand', next_qty);
end;
$$;

grant execute on function public.post_inventory_movement(uuid, text, numeric, text) to authenticated;