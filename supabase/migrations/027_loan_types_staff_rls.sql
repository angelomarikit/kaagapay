-- 027: Staff can manage loan types (rates/terms for member applications)

drop policy if exists staff_loan_types on public.loan_types;
create policy staff_loan_types on public.loan_types
  for all using (public.is_staff()) with check (public.is_staff());