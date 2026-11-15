# Design compliance gaps (PNG vs built UI)

Use this with the `design/` folder when judging whether instructions were followed.

## High-impact visual gaps

| Area | Design reference | Current implementation | Gap |
|------|------------------|------------------------|-----|
| Login / Register left panel | Building photo, red/navy swoosh, people silhouette | Cropped hero from `member.png` + gradient overlay | Not the same stock art as Figma/export |
| Login card inputs | Lock icon on password, rounded soft borders | Basic shadcn inputs; lock icon missing on password | Minor |
| Admin dashboard | Exact 5 KPI labels, trend chips, 4-row transactions table | Live KPIs when DB connected; chart is simplified | Layout similar; data not always from DB |
| Fuel & Expense | Right detail drawer, charts footer, vehicle photo | Tabs + table only; no side drawer/charts block | **Major** — master shell reference not fully cloned |
| Dispatch & Scheduling | Gantt day view, map, dispatch detail drawer | Table + stats; no timeline/map | **Major** |
| Daily Collections POS | 3-column POS, trip selectors, fare quick-add grid | 3-column simplified cart | Partial — missing trip/vehicle header row from PNG |
| Loans | Inline application form + schedule on one screen | Dashboard table; sub-routes stub | **Major** |
| Accounting hub | AP/AR mini-tables, donut chart, quick action column | Partial charts + generic finance subpages | Major |
| Member dashboard | Photo welcome banner, exact card colors | Gradient banner; card layout approximated | Moderate |
| Settings | 5 sections × 4 cards with colored icons | Grid without per-card icons/colors | Moderate |

## Structural / nav (mostly aligned)

- Sidebar module order and Dispatch as separate module: **implemented**
- Trip schedule/records merged at `/admin/fleet/dispatch` (no duplicate nav)
- No Google Sign-In: **implemented**
- Design annotation blue boxes not rendered: **implemented**

## Functional vs design

Many screens match **information architecture** (routes, menus) more closely than **visual density** (drawers, Gantt, POS trip binding, split panels). The master prompt asked for working integrated ERP, not only static mocks — tradeoff favored working Supabase flows over pixel-perfect Fuel & Expense shell on every page.

## Suggested review order for GPT

1. `design/login page.png` → `src/layouts/AuthLayout.tsx`, `src/features/auth/LoginPage.tsx`
2. `design/dashboard.png` → `src/features/dashboard/AdminDashboard.tsx`
3. `design/transport and fleet - fuel and expense.png` → `src/features/fleet/FuelExpensePage.tsx`, `src/layouts/AdminSidebar.tsx`
4. `design/daily collections.png` → `src/features/collections/CollectionsPosPage.tsx`
5. `design/member.png` → `src/features/member/MemberDashboard.tsx`, `src/layouts/MemberLayout.tsx`