-- 014: development seed (DO NOT run in production)
insert into public.chart_of_accounts (code, name, account_type) values
  ('1010', 'Cash on Hand', 'asset'),
  ('1020', 'Cooperative Bank', 'asset'),
  ('4010', 'Transport Income', 'income'),
  ('5010', 'Operating Expenses', 'expense'),
  ('2010', 'Member Share Capital', 'equity')
on conflict (code) do nothing;

insert into public.cash_bank_accounts (name, account_type, gl_account_id)
select 'Cash on Hand', 'cash', id from public.chart_of_accounts where code = '1010'
on conflict do nothing;

insert into public.fare_types (code, name, unit_price) values
  ('regular', 'Regular Fare', 58.00),
  ('student', 'Student Fare', 46.00),
  ('senior_pwd', 'Senior/PWD', 41.00),
  ('baggage', 'Baggage', 20.00)
on conflict (code) do nothing;

insert into public.loan_types (name, default_rate, default_term_months) values
  ('Vehicle Financing', 8.0000, 36),
  ('Working Capital', 12.0000, 24)
on conflict do nothing;

insert into public.routes (name, origin, destination, distance_km) values
  ('San Jose - Baguio', 'San Jose', 'Baguio', 230)
on conflict do nothing;