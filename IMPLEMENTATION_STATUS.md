# Implementation status — KAAGAPAY ERP

_Last updated: functionality-first pass (design pixel-matching cancelled)_

## Your action required

1. **Run SQL** in Supabase SQL Editor, in order: `001` through **`015`** (see `supabase/README.md`).
2. **`.env`**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
3. **Bootstrap admin** (SQL Editor only, not from the app):
   ```sql
   select public.bootstrap_admin('YOUR_AUTH_USER_UUID');
   ```

## Completed and verified (local code)

| Area | Status |
|------|--------|
| Stack | Vite, React 19, TS, Tailwind, shadcn-style UI, Router, TanStack Query, RHF+Zod, Supabase client |
| Auth UI | Simple navy/white split; logo from `public/branding/logo.png`; no screenshot backgrounds |
| Auth guards | **Requires Supabase config + login** for admin/member (no more open admin when `.env` missing) |
| Migrations | `001`–`014` + **`015_rls_transport_fuel.sql`** (fleet RLS, `bootstrap_admin` revoked from anon/authenticated) |
| Executive dashboard | KPIs from DB (members, vehicles, collections, month income/expenses, loans outstanding); recent collections table |
| Membership applications | Approve via RPC; reject updates status; errors surfaced |
| Fleet vehicles | List + register vehicle form (insert to `vehicles`) |
| Fuel & expense | DB-only table + record fuel form (no design fixtures) |
| Daily Collections POS | Cart + `confirm_collection` RPC, idempotent `client_request_id`, digital pay → `pending` verification |
| RPCs | `approve_membership_application`, `confirm_collection`, `create_dispatch`, `post_journal_entry`, `bootstrap_admin` |
| Tests | `npm run test` — `lib/money.test.ts` (4 tests) |

## Partially complete (needs DB + more UI)

- **Dispatch** — create form + RPC; conflict rules in SQL; full trip lifecycle UI incomplete
- **Trip schedule / records** — pages exist; tie to `dispatches` / trips end-to-end needs verification after SQL
- **General Ledger / AP / AR / Cash & Bank** — schema + stubs; posting UI not fully wired to `post_journal_entry` everywhere
- **Loans** — schema + sub-pages; disbursement/repayment flows need full forms + RPC hooks
- **Payroll, inventory, documents, user access** — `AdminStubPage` placeholders (intentionally labeled incomplete)
- **Member portal** — shell + dashboard; live data when `profiles.member_id` is set after approval
- **Reports** — page shell; PDF/Excel export not implemented
- **Fuel/expense → GL** — inserts do not auto-post journals yet

## Not verified live

**Supabase was not connected in this environment** (`ENOSPC` on disk blocked `npm run build`). After you configure `.env` and run migrations, manually test:

1. Register → staff approve → member can log in → appears in Members  
2. Register vehicle → record fuel  
3. POS collection → receipt → row in `collection_transactions` + journal (if RPC posts)  
4. Duplicate POS submit with same `client_request_id` → no double post  
5. Non-staff user → cannot access `/admin`  
6. Member → cannot see other members’ loans  

## Failed / blocked checks this session

| Check | Result |
|-------|--------|
| `npm run build` | **Not run** — disk full (`ENOSPC`) on agent machine |
| Live Supabase workflows 1–10 | **Blocked** — no project credentials in environment |

## Remaining problems

- **Accounting integration** for fuel, maintenance, loans, payroll still incomplete  
- **RBAC** — 19 roles in DB; UI role editor not built  
- **Bootstrap** — must be run in SQL Editor; migration `015` blocks client-side abuse  
- **Remove** optional duplicate asset `public/branding/auth-login-bg.png` (leftover from design pass) to save disk  

## Design policy (current)

Simple cooperative admin UI: navy sidebar, red active item, blue primary buttons, white content. **Do not** use `/design` screenshots as UI backgrounds or pixel targets.