# KAAGAPAY Supabase migrations

Execute SQL files in `migrations/` **in numeric order** using the Supabase SQL Editor.

## Order

1. `001_extensions_profiles.sql`
2. `002_rbac.sql`
3. `003_membership.sql`
4. `004_transport.sql`
5. `005_dispatch.sql`
6. `006_collections.sql`
7. `007_accounting.sql`
8. `008_loans.sql`
9. `009_admin_modules.sql`
10. `010_settings_audit.sql`
11. `011_rls.sql`
12. `012_rpc.sql`
13. `013_storage.sql`
14. `014_seed_dev.sql` (development only)
15. `015_rls_transport_fuel.sql` (fleet RLS + restrict `bootstrap_admin` RPC from app clients)
16. `016_rls_staff_grants.sql` (**required** — staff RLS policies + RPC grants)
17. `017_collection_verified_gl.sql` (GL post only when digital payment verified; dev driver seed)
18. `018_membership_loan_rpcs.sql` (`record_contribution`, `approve_loan_application`, `record_loan_repayment`)
19. `019_rls_loan_repayments_members.sql` (loan schedule/repayment RLS, member profile update)
20. `020_settings_rls.sql` (system_settings, audit_logs, fare/membership types, RBAC read)
21. `021_admin_modules_rls.sql` (payroll, inventory, documents staff policies)
22. `022_registration_application_rpc.sql` (public registration + `submit_membership_application` RPC)
23. `023_member_loan_application_rpc.sql` (`submit_loan_application` RPC + loan type read RLS)
24. `024_loan_application_rate_from_type.sql` (member applications use admin loan-type rate only)
25. `025_operations_finance_enhancements.sql` (POS products, loan due dates, payroll/docs columns, inventory RPC)

## If a migration says “relation already exists”

That migration (or part of it) already ran. Options:

1. **Re-run the updated file** — `006_collections.sql` now uses `CREATE TABLE IF NOT EXISTS` and can be run again safely.
2. **Skip that file** and continue with the next number (`007`, `008`, …).
3. In SQL Editor, check what exists:

```sql
select tablename from pg_tables
where schemaname = 'public'
  and tablename in ('collection_transactions', 'collection_items', 'fare_types')
order by 1;
```

If all three exist, skip `006` and run `007` onward.

## Bootstrap super admin

After a staff user signs up or is invited in Supabase Auth:

```sql
select public.bootstrap_admin('YOUR_AUTH_USER_UUID');
```

Assign additional roles in `user_roles` as needed.

## Environment

Copy `.env.example` to `.env` and set:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Never expose the service role key in the frontend.