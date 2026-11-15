-- 002: roles and permissions
create table public.roles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text
);

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  action text not null
);

create table public.role_permissions (
  role_id uuid not null references public.roles (id) on delete cascade,
  permission_id uuid not null references public.permissions (id) on delete cascade,
  primary key (role_id, permission_id)
);

create table public.user_roles (
  user_id uuid not null references public.profiles (id) on delete cascade,
  role_id uuid not null references public.roles (id) on delete cascade,
  primary key (user_id, role_id)
);

insert into public.roles (code, name) values
  ('super_admin', 'Super Admin'),
  ('general_manager', 'General Manager'),
  ('membership_officer', 'Membership Officer'),
  ('cashier', 'Cashier / Collection Officer'),
  ('loan_officer', 'Loan Officer'),
  ('fleet_manager', 'Fleet / Operations Manager'),
  ('accountant', 'Accountant / Bookkeeper'),
  ('member', 'Cooperative Member')
on conflict do nothing;

insert into public.permissions (code, name, action) values
  ('members.view', 'View members', 'view'),
  ('members.create', 'Create members', 'create'),
  ('members.approve', 'Approve applications', 'approve'),
  ('collections.post', 'Post collections', 'post'),
  ('dispatch.manage', 'Manage dispatch', 'edit'),
  ('finance.post', 'Post journal entries', 'post'),
  ('finance.reverse', 'Reverse entries', 'reverse'),
  ('loans.approve', 'Approve loans', 'approve'),
  ('settings.manage', 'Manage settings', 'manage')
on conflict do nothing;