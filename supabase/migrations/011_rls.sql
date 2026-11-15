-- 011: row level security
alter table public.profiles enable row level security;
alter table public.members enable row level security;
alter table public.membership_applications enable row level security;
alter table public.contributions enable row level security;
alter table public.vehicles enable row level security;
alter table public.dispatches enable row level security;
alter table public.collection_transactions enable row level security;
alter table public.collection_items enable row level security;
alter table public.journal_entries enable row level security;
alter table public.journal_lines enable row level security;
alter table public.loans enable row level security;
alter table public.loan_applications enable row level security;
alter table public.documents enable row level security;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.user_type = 'staff' and p.is_active = true
  );
$$;

create or replace function public.current_member_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select member_id from public.profiles where id = auth.uid();
$$;

create policy profiles_select_own on public.profiles
  for select using (auth.uid() = id or public.is_staff());

create policy profiles_insert_own on public.profiles
  for insert with check (auth.uid() = id);

create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id);

create policy staff_all_members on public.members
  for all using (public.is_staff());

create policy member_own_record on public.members
  for select using (id = public.current_member_id());

create policy staff_applications on public.membership_applications
  for all using (public.is_staff());

create policy applicant_own_application on public.membership_applications
  for select using (applicant_user_id = auth.uid());

create policy applicant_insert_application on public.membership_applications
  for insert with check (applicant_user_id = auth.uid());

create policy staff_financial on public.journal_entries
  for select using (public.is_staff());

create policy staff_collections on public.collection_transactions
  for select using (public.is_staff());

create policy staff_insert_collections on public.collection_transactions
  for insert with check (public.is_staff());

create policy member_own_loans on public.loans
  for select using (member_id = public.current_member_id() or public.is_staff());

create policy staff_documents on public.documents
  for select using (public.is_staff());