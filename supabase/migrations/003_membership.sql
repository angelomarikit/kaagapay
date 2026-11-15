-- 003: membership domain
create table public.membership_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true
);

create table public.members (
  id uuid primary key default gen_random_uuid(),
  member_code text not null unique,
  full_name text not null,
  email text,
  contact_number text,
  address text,
  membership_type text,
  status text not null default 'active',
  date_of_membership date,
  user_id uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

alter table public.profiles
  add constraint profiles_member_id_fkey foreign key (member_id) references public.members (id);

create table public.membership_applications (
  id uuid primary key default gen_random_uuid(),
  applicant_user_id uuid references public.profiles (id),
  full_name text not null,
  email text,
  contact_number text,
  membership_type text,
  status text not null default 'pending',
  rejection_reason text,
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.membership_status_history (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  previous_status text,
  new_status text not null,
  changed_by uuid references public.profiles (id),
  changed_at timestamptz not null default now(),
  notes text
);

create table public.contribution_categories (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  gl_account_id uuid
);

create table public.contributions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id),
  category_id uuid references public.contribution_categories (id),
  amount numeric(18, 2) not null check (amount >= 0),
  contributed_at timestamptz not null default now(),
  receipt_reference text,
  journal_entry_id uuid,
  notes text
);

create index members_status_idx on public.members (status);
create index applications_status_idx on public.membership_applications (status);

create or replace function public.next_member_code()
returns text
language plpgsql
as $$
declare
  n bigint;
begin
  select count(*) + 1 into n from public.members;
  return 'KAG-' || lpad(n::text, 4, '0');
end;
$$;