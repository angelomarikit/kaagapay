-- 015: RLS for fleet fuel/expense tables + tighten bootstrap_admin

alter table public.fuel_transactions enable row level security;
alter table public.operating_expenses enable row level security;
alter table public.maintenance_records enable row level security;
alter table public.drivers enable row level security;
alter table public.routes enable row level security;

create policy staff_vehicles on public.vehicles for all using (public.is_staff()) with check (public.is_staff());
create policy staff_fuel on public.fuel_transactions for all using (public.is_staff()) with check (public.is_staff());
create policy staff_operating_expenses on public.operating_expenses for all using (public.is_staff()) with check (public.is_staff());
create policy staff_maintenance on public.maintenance_records for all using (public.is_staff()) with check (public.is_staff());
create policy staff_drivers on public.drivers for all using (public.is_staff()) with check (public.is_staff());
create policy staff_routes on public.routes for all using (public.is_staff()) with check (public.is_staff());

-- bootstrap_admin: only callable from SQL editor (postgres / service role), not authenticated clients
revoke all on function public.bootstrap_admin(uuid) from public;
revoke all on function public.bootstrap_admin(uuid) from anon;
revoke all on function public.bootstrap_admin(uuid) from authenticated;