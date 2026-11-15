# Package for external design / spec review (e.g. ChatGPT)

## Contents

| Folder / file | Purpose |
|---------------|---------|
| **`design/`** | **Approved UI screenshots (source of truth for layout)** — compare every admin/member/auth screen to matching routes in `DESIGN_MAPPING.md` |
| `src/` | React implementation |
| `DESIGN_MAPPING.md` | Filename → route mapping |
| `DESIGN_COMPLIANCE_GAPS.md` | Honest list of where implementation diverges from PNGs |
| `IMPLEMENTATION_STATUS.md` | Functional completeness (backend, modules) |
| `supabase/migrations/` | Database SQL |

## How to review design fidelity

1. Open a PNG under `design/` (e.g. `dashboard.png`, `login page.png`, `transport and fleet - fuel and expense.png`).
2. Find the route in `DESIGN_MAPPING.md`.
3. Run the app (`npm install && npm run dev`) or inspect the React page under `src/features/`.
4. Check against `DESIGN_COMPLIANCE_GAPS.md` for known mismatches.

## Master prompt reference

The original client brief required pixel-faithful shells, navy/red KAAGAPAY branding, Fuel & Expense as admin shell reference, separate Dispatch module, no Google Sign-In, no blue “Cursor” callouts in UI.

## This zip intentionally includes

- All **26 design PNGs** (including `logo.png`)
- **No** `node_modules/` or `dist/` (run `npm install` locally)