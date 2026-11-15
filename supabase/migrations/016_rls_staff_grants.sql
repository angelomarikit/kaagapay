-- 016: Staff RLS policies for tables that had RLS enabled but no policies + RPC grants

-- Dispatches & trips
create policy staff_dispatches on public.dispatches for all using (public.is_staff()) with check (public.is_staff());

alter table public.trip_records enable row level security;
create policy staff_trip_records on public.trip_records for all using (public.is_staff()) with check (public.is_staff());

-- Contributions
create policy staff_contributions on public.contributions for all using (public.is_staff()) with check (public.is_staff());
create policy member_own_contributions on public.contributions for select
  using (member_id = public.current_member_id());

-- Collection line items (writes happen via confirm_collection RPC; staff can read)
create policy staff_collection_items on public.collection_items for select using (public.is_staff());
create policy staff_insert_collection_items on public.collection_items for insert with check (public.is_staff());

-- Journal lines
create policy staff_journal_lines on public.journal_lines for select using (public.is_staff());

-- Loans
create policy staff_loan_applications on public.loan_applications for all using (public.is_staff()) with check (public.is_staff());
create policy member_own_loan_applications on public.loan_applications for select
  using (member_id = public.current_member_id());

create policy staff_loans_all on public.loans for all using (public.is_staff()) with check (public.is_staff());

-- Finance tables (read for staff; writes via RPC where applicable)
alter table public.chart_of_accounts enable row level security;
create policy staff_chart on public.chart_of_accounts for select using (public.is_staff());

alter table public.accounts_payable enable row level security;
alter table public.accounts_receivable enable row level security;
alter table public.cash_bank_accounts enable row level security;
alter table public.budgets enable row level security;

create policy staff_ap on public.accounts_payable for all using (public.is_staff()) with check (public.is_staff());
create policy staff_ar on public.accounts_receivable for all using (public.is_staff()) with check (public.is_staff());
create policy staff_cash_bank on public.cash_bank_accounts for all using (public.is_staff()) with check (public.is_staff());
create policy staff_budgets on public.budgets for all using (public.is_staff()) with check (public.is_staff());

-- Allow authenticated staff to call server-side RPCs (authorization inside functions)
grant execute on function public.confirm_collection(jsonb) to authenticated;
grant execute on function public.create_dispatch(jsonb) to authenticated;
grant execute on function public.approve_membership_application(uuid, text) to authenticated;
grant execute on function public.post_journal_entry(jsonb) to authenticated;