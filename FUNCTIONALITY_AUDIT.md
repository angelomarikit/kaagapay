# KAAGAPAY — Functionality Audit

**Audit date:** 2026-11-15  
**Scope:** All routes in `src/routes/router.tsx`, visible controls, Supabase tables/RPCs in `supabase/migrations/001–019`.  
**Live Supabase:** Not verified in CI; staff must run migrations **016–019** and test in dev.

## Legend

| Repair status | Meaning |
|---------------|---------|
| **Repaired** | Handler + DB path implemented in code |
| **Partial** | Some actions work; others missing |
| **Stub** | UI only / EmptyState |
| **Blocked** | Depends on migration, RLS, or env |

| Test status | Meaning |
|-------------|---------|
| **Build** | `npm run build` passes |
| **Untested** | No live Supabase verification in this session |
| **Verified** | Manually confirmed against database (none yet) |

---

## Auth (`/login`, `/register`, `/forgot-password`, `/reset-password`)

| Control | Intended action | Handler | DB | Issue | Repair | Test |
|---------|-----------------|---------|-----|-------|--------|------|
| Login submit | Sign in | `LoginPage` + Supabase Auth | `auth.users`, `profiles` | — | Repaired | Build |
| Register submit | Pending registration | `RegisterPage` | `profiles` | — | Repaired | Untested |
| Protected routes | Staff vs member | `ProtectedRoute` | `profiles.user_type` | — | Repaired | Untested |

---

## Admin dashboard (`/admin`)

| Control | Intended action | Handler | DB | Issue | Repair | Test |
|---------|-----------------|---------|-----|-------|--------|------|
| KPI cards | Live stats | `useDashboardStats` | collections, members, dispatches | — | Partial | Untested |
| Recent activity | Recent collections | Query | `collection_transactions` | — | Partial | Untested |

---

## Membership

### Members (`/admin/membership/members`)

| Control | Intended action | Handler | DB | Issue | Repair | Test |
|---------|-----------------|---------|-----|-------|--------|------|
| Add Member | Form + insert | `MembersPage` | `members`, `next_member_code()` | Was placeholder row | **Repaired** | Untested |
| Edit / Eye | View + edit form | `openEdit` | `members` | Was unwired | **Repaired** | Untested |
| Deactivate (trash) | Set inactive | `deactivateMember` | `members.status` | Was unwired | **Repaired** | Untested |
| Search | Filter | Query `.ilike` | `members` | — | Repaired | Untested |
| Print statement | PDF | — | contributions | Not implemented | Stub | — |

### Applications (`/admin/membership/applications`)

| Control | Intended action | Handler | DB | Issue | Repair | Test |
|---------|-----------------|---------|-----|-------|--------|------|
| Approve | Create member | `approve_membership_application` RPC | `members`, `profiles` | Needs 016 grants | Repaired | Untested |
| Reject | Status + reason | Update | `membership_applications` | — | Repaired | Untested |

### Contributions (`/admin/membership/contributions`)

| Control | Intended action | Handler | DB | Issue | Repair | Test |
|---------|-----------------|---------|-----|-------|--------|------|
| Record Contribution | Form + GL | `record_contribution` RPC (018) | `contributions`, `journal_entries` | Needs 018 | **Repaired** | Untested |
| Table | List | Query | `contributions` | — | Repaired | Untested |

### Status (`/admin/membership/status`)

| Control | Intended action | Handler | DB | Issue | Repair | Test |
|---------|-----------------|---------|-----|-------|--------|------|
| Page content | Status history | `MembershipStatusPage` | `membership_status_history` | Inspect page | Partial | Untested |

---

## Fleet

### Vehicles (`/admin/fleet/vehicles`)

| Control | Intended action | Handler | DB | Issue | Repair | Test |
|---------|-----------------|---------|-----|-------|--------|------|
| Register vehicle | Insert | Form mutation | `vehicles` | — | Repaired | Untested |
| Assign driver | Update vehicle | — | `vehicles`, `drivers` | May be partial | Partial | Untested |

### Maintenance (`/admin/fleet/maintenance`)

| Control | Intended action | Handler | DB | Issue | Repair | Test |
|---------|-----------------|---------|-----|-------|--------|------|
| New Maintenance Record | Insert | `MaintenancePage` | `maintenance_records` | Was unwired | **Repaired** | Untested |
| GL link | Post expense | — | journal | Not wired | Incomplete | — |

### Fuel (`/admin/fleet/fuel-expense`)

| Control | Intended action | Handler | DB | Issue | Repair | Test |
|---------|-----------------|---------|-----|-------|--------|------|
| Record fuel | Insert | `FuelExpensePage` | `fuel_transactions` | GL optional | Repaired | Untested |

---

## Dispatch & trips

### Dispatch & trips (`/admin/fleet/dispatch`)

| Control | Intended action | Handler | DB | Issue | Repair | Test |
|---------|-----------------|---------|-----|-------|--------|------|
| Create dispatch | RPC | `create_dispatch` | `dispatches` | RLS without 016 blocked | Repaired | Untested |
| Start / complete trip | Update + `trip_records` | Mutations | `dispatches`, `trip_records` | — | Repaired | Untested |
| Trip records table | Completed history | `DispatchDashboardPage` | `trip_records` | Merged from removed trip pages | Repaired | Untested |

Legacy URLs `/admin/dispatch`, `/admin/trips/schedule`, `/admin/trips/records` redirect to `/admin/fleet/dispatch`.

---

## Collections POS (`/admin/collections/pos`)

| Control | Intended action | Handler | DB | Issue | Repair | Test |
|---------|-----------------|---------|-----|-------|--------|------|
| Fare buttons | Add line items | Local cart | `fare_types` | — | Repaired | Untested |
| Qty +/- / remove | Cart | Local state | — | — | **Repaired** | Build |
| Link dispatch | FK on collection | Select + payload | `dispatches` | — | **Repaired** | Untested |
| Payment methods | Cash / digital | `confirm_collection` | `collection_transactions` | Digital GL: 017 | **Repaired** | Untested |
| Record collection | Atomic post | `confirm_collection` RPC | items + optional GL | Needs 016–017 | Repaired | Untested |
| Recent collections | History table | Query | `collection_transactions` | — | **Repaired** | Untested |
| Print receipt | PDF | — | — | Not implemented | Stub | — |

---

## Loans (`/admin/loans`, `/admin/loans/:section`)

| Control | Intended action | Handler | DB | Issue | Repair | Test |
|---------|-----------------|---------|-----|-------|--------|------|
| Dashboard list | Active loans | Query | `loans` | Fake MTD KPI | Partial | Untested |
| New application | Navigate | `LoansDashboardPage` | — | — | **Repaired** | Build |
| Applications CRUD | Submit/approve/reject | `LoanSubPage` | `loan_applications`, RPC 018 | Needs 018 | **Repaired** | Untested |
| Record repayment | RPC | `record_loan_repayment` | `loan_repayments` | Needs 019 RLS | **Repaired** | Untested |
| Reports / export | Reports | EmptyState | — | Stub | Stub | — |

---

## Finance (`/admin/finance`, `/admin/finance/:section`)

| Control | Intended action | Handler | DB | Issue | Repair | Test |
|---------|-----------------|---------|-----|-------|--------|------|
| Table dump | Read 50 rows | `FinanceSubPage` | varies by section | No post/edit | Partial | Untested |
| Post journal | Balanced entry | — | `post_journal_entry` RPC | No UI | Stub | — |
| AP/AR payments | Workflows | — | AP/AR tables | No UI | Stub | — |

---

## Reports (`/admin/reports`)

| Control | Intended action | Handler | DB | Issue | Repair | Test |
|---------|-----------------|---------|-----|-------|--------|------|
| Generate / export | Real data | `ReportsPage` | — | Placeholder | Stub | — |

---

## Settings (`/admin/settings`)

| Control | Intended action | Handler | DB | Issue | Repair | Test |
|---------|-----------------|---------|-----|-------|--------|------|
| Cooperative settings | CRUD | `SettingsPage` | `cooperative_settings` | Partial read | Partial | Untested |

---

## Admin stubs (`/admin/payroll`, `/inventory`, `/documents`, `/users`)

| Control | Intended action | Handler | DB | Issue | Repair | Test |
|---------|-----------------|---------|-----|-------|--------|------|
| All | Module CRUD | `AdminStubPage` | 009 tables | EmptyState only | Stub | — |

---

## Member portal (`/member`, `/member/:section`)

| Control | Intended action | Handler | DB | Issue | Repair | Test |
|---------|-----------------|---------|-----|-------|--------|------|
| Dashboard KPIs | Real balances | `MemberDashboard` queries | contributions, loans | Was hardcoded | **Repaired** | Untested |
| Sub-pages | Own data | `MemberSubPage` | RLS-scoped | Was EmptyState | **Repaired** | Untested |
| Profile save | Contact update | Update `members` | Needs policy 019 | **Repaired** (019) | Untested |
| Apply for loan (member) | Application | — | `loan_applications` | Staff-only insert today | Incomplete | — |

---

## Database migration checklist (blockers)

| Migration | Purpose | If skipped |
|-----------|---------|------------|
| **016** | Staff RLS + RPC grants | Silent denials on dispatches, contributions, loans |
| **017** | Digital payments + driver seed | GL posts pending payments; no sample driver |
| **018** | Contribution + loan RPCs | Contribution/loan buttons error |
| **019** | Loan repayment RLS + member update | Repayment list / profile update may fail |

---

## Security notes

- `bootstrap_admin` revoked from `anon`/`authenticated` in **015** — run in SQL Editor only.
- Financial writes should use RPCs (`confirm_collection`, `record_contribution`, `post_journal_entry`, loan RPCs).
- Service role must not ship to the browser (`.env` uses anon key only).