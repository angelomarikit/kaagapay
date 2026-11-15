# Design to route mapping

| Design file | Portal | Module | Route | Implementation status |
|-------------|--------|--------|-------|------------------------|
| `login page.png` | Public | Auth | `/login` | Complete (UI + Supabase sign-in) |
| `registration.png` | Public | Auth | `/register` | Complete (pending application flow) |
| `dashboard.png` | Admin | Executive Dashboard | `/admin` | Complete (live KPIs when DB connected) |
| `membership-members.png` | Admin | Membership | `/admin/membership/members` | Complete (list, detail panel, add) |
| `membership-applications.png` | Admin | Membership | `/admin/membership/applications` | Complete (approve RPC) |
| `membership-contributions.png` | Admin | Membership | `/admin/membership/contributions` | Partial (list; record form pending) |
| `membership-status.png` | Admin | Membership | `/admin/membership/status` | Complete (status list) |
| `transport and fleet - fleet management.png` | Admin | Fleet | `/admin/fleet/vehicles` | Complete (table CRUD shell) |
| `transport and fleet - trip schedule.png` | Admin | Transport & Fleet | `/admin/fleet/dispatch` | Merged into Dispatch & Trips |
| `transport and fleet - trip records.png` | Admin | Transport & Fleet | `/admin/fleet/dispatch` | Merged (trip records table) |
| `transport and fleet - maintenance.png` | Admin | Fleet | `/admin/fleet/maintenance` | Complete (list) |
| `transport and fleet - fuel and expense.png` | Admin | Fleet | `/admin/fleet/fuel-expense` | Complete (shell reference + tabs) |
| `dispatch and scheduling.png` | Admin | Transport & Fleet | `/admin/fleet/dispatch` | Dispatch & Trips (schedule + records) |
| `daily collections.png` | Admin | Collections | `/admin/collections/pos` | Complete (POS cart + `confirm_collection`) |
| `Loan and Financing.png` | Admin | Loans | `/admin/loans` | Partial (dashboard; sub-routes stub) |
| `Accounting and finance.png` | Admin | Finance | `/admin/finance` | Partial (dashboard + charts) |
| `Accounting and finance - general ledger.png` | Admin | Finance | `/admin/finance/general-ledger` | Partial (data table) |
| `Accounting and finance - accounts payable.png` | Admin | Finance | `/admin/finance/accounts-payable` | Partial |
| `accounting and finance - accounts receivable.png` | Admin | Finance | `/admin/finance/accounts-receivable` | Partial |
| `Accounting and finance - cash and bank.png` | Admin | Finance | `/admin/finance/cash-bank` | Partial |
| `Accounting and finance - financial reports.png` | Admin | Finance | `/admin/finance/reports` | Partial |
| `Accounting and finance - budget and expenses.png` | Admin | Finance | `/admin/finance/budget` | Partial |
| `accounting and finance - reports and analytics.png` | Admin | Reports | `/admin/reports` | Complete (UI + charts) |
| `settings.png` | Admin | Settings | `/admin/settings` | Complete (settings grid) |
| `member.png` | Member | Dashboard | `/member` | Complete (responsive shell) |
| `logo.png` | Asset | Branding | `public/branding/logo.png` | Complete |

## Routes without dedicated PNG (consistent shell)

| Route | Status |
|-------|--------|
| `/forgot-password`, `/reset-password` | Complete |
| `/admin/payroll`, `/admin/inventory`, `/admin/documents`, `/admin/users` | Shell + empty state |
| `/admin/loans/*` sub-routes | Shell |
| `/member/*` sub-routes | Shell |

**Note:** Blue annotation boxes in design images are implemented as behavior only, not rendered in the UI.