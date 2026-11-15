-- 020: RLS for settings, audit, and configuration tables

alter table public.system_settings enable row level security;
alter table public.audit_logs enable row level security;

create policy staff_system_settings on public.system_settings for all
  using (public.is_staff()) with check (public.is_staff());

create policy staff_audit_logs on public.audit_logs for select
  using (public.is_staff());

alter table public.fare_types enable row level security;
create policy staff_fare_types on public.fare_types for all
  using (public.is_staff()) with check (public.is_staff());

alter table public.membership_types enable row level security;
create policy staff_membership_types on public.membership_types for all
  using (public.is_staff()) with check (public.is_staff());

alter table public.contribution_categories enable row level security;
create policy staff_contribution_categories on public.contribution_categories for all
  using (public.is_staff()) with check (public.is_staff());

alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_roles enable row level security;

create policy staff_roles_read on public.roles for select using (public.is_staff());
create policy staff_permissions_read on public.permissions for select using (public.is_staff());
create policy staff_role_permissions_read on public.role_permissions for select using (public.is_staff());
create policy staff_user_roles_read on public.user_roles for select using (public.is_staff());

create policy staff_profiles_manage on public.profiles for select using (public.is_staff());
create policy staff_profiles_update on public.profiles for update using (public.is_staff());

-- Chart of accounts: allow staff to maintain COA from Settings (016 was select-only)
create policy staff_chart_manage on public.chart_of_accounts for insert with check (public.is_staff());
create policy staff_chart_update on public.chart_of_accounts for update using (public.is_staff());