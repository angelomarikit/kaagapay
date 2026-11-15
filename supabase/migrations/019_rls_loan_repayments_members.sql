-- 019: RLS for loan repayments + member self-service profile fields

alter table public.loan_repayments enable row level security;
alter table public.loan_schedules enable row level security;

create policy staff_loan_repayments on public.loan_repayments for all
  using (public.is_staff()) with check (public.is_staff());

create policy member_loan_repayments on public.loan_repayments for select
  using (
    exists (
      select 1 from public.loans l
      where l.id = loan_id and l.member_id = public.current_member_id()
    )
  );

create policy staff_loan_schedules on public.loan_schedules for select using (public.is_staff());

create policy member_loan_schedules on public.loan_schedules for select
  using (
    exists (
      select 1 from public.loans l
      where l.id = loan_id and l.member_id = public.current_member_id()
    )
  );

create policy member_update_own_member on public.members for update
  using (id = public.current_member_id())
  with check (id = public.current_member_id());