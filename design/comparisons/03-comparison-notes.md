# Fuel & Expense — visual comparison (2026-11-15)

| Asset | Path |
|-------|------|
| Reference (approved PNG) | `01-reference-fuel-expense.png` |
| Implementation screenshot | `02-implemented-fuel-expense-1920.png` |
| Visual spec | `../specs/fuel-expense-visual-spec.md` |

## Viewport

- Target: **1920×1080** (CDP `Emulation.setDeviceMetricsOverride` applied)
- Route: `http://localhost:5176/admin/fleet/fuel-expense` (no Supabase → staff guard bypass)

## Aligned with reference

- Sidebar width **260px**, navy, Transport & Fleet expanded red, **Fuel & Expense** white pill + red dot
- Header search placeholder for fuel page
- Breadcrumb, title + fuel icon, **Add Transaction** with chevron
- Four KPI cards with design amounts and trend lines
- Module tabs with icons (Fuel Transactions active blue)
- Filter bar (date, vehicle, type, search, export)
- Split table + right **Expense Record Details** panel
- Footer trend chart + fuel usage summary blocks
- Fixture data matches sample rows (FUEL-2026-068, types, pagination copy)

## Remaining differences (not exact 1:1)

1. **Browser capture size** — Cursor browser panel may crop below full 1920×1080; re-capture in a full-width browser for sign-off.
2. **Vehicle/bus photo** — Reference uses a photo; implementation uses icon placeholder until asset provided.
3. **Receipt thumbnail** — Text placeholder vs scanned Petron receipt in PNG.
4. **Supabase banner** — Amber env warning visible when `.env` missing (not in design).
5. **Header title** — Shorter “KAAGAPAY Cooperative Management System” on this route (matches fuel PNG, not long cooperative title on dashboard PNG).
6. **Sub-pixel spacing** — KPI icon colors and table row density may differ slightly from Figma export.

## Files changed

- `src/features/fleet/FuelExpensePage.tsx` — full layout
- `src/features/fleet/fuelExpenseFixtures.ts` — visual fixtures + live merge
- `src/layouts/AdminSidebar.tsx` — design-accurate nav states
- `src/layouts/AdminHeader.tsx` — route-specific search/title
- `src/layouts/AdminLayout.tsx` — main padding/background
- `src/layouts/adminChrome.ts` — chrome tokens
- `design/specs/fuel-expense-visual-spec.md`

## Functionality smoke

- Page renders at `/admin/fleet/fuel-expense`
- Row click selects detail panel
- Detail sub-tabs switch (Details / Receipt / Trip Link)
- Module tabs switch (UI state)
- Add Transaction / Export / filters are present (wire to Supabase in next pass)

## Next correction pass

- Add real bus + receipt images under `public/assets/`
- Hide config banner on design-review route or when `import.meta.env.DEV`
- Full-width screenshot + optional pixel diff script