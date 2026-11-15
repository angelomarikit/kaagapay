-- 021: RLS for payroll, inventory, and documents (staff CRUD)

alter table public.employees enable row level security;
alter table public.payroll_runs enable row level security;
alter table public.payroll_items enable row level security;
alter table public.inventory_categories enable row level security;
alter table public.inventory_items enable row level security;
alter table public.inventory_movements enable row level security;

create policy staff_employees on public.employees for all
  using (public.is_staff()) with check (public.is_staff());

create policy staff_payroll_runs on public.payroll_runs for all
  using (public.is_staff()) with check (public.is_staff());

create policy staff_payroll_items on public.payroll_items for all
  using (public.is_staff()) with check (public.is_staff());

create policy staff_inventory_categories on public.inventory_categories for all
  using (public.is_staff()) with check (public.is_staff());

create policy staff_inventory_items on public.inventory_items for all
  using (public.is_staff()) with check (public.is_staff());

create policy staff_inventory_movements on public.inventory_movements for all
  using (public.is_staff()) with check (public.is_staff());

drop policy if exists staff_documents on public.documents;
create policy staff_documents on public.documents for all
  using (public.is_staff()) with check (public.is_staff());