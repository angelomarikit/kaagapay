# Fuel & Expense — visual specification (reference PNG)

Reference: `design/transport and fleet - fuel and expense.png`  
Target viewport: **1920 × 1080** (desktop acceptance)

## Chrome

| Region | Spec |
|--------|------|
| Sidebar width | **260px**, `#0f2847` / navy |
| Header height | **~64px**, white, bottom border `#e5e7eb` |
| Main background | `#f4f6f9` |
| Content max width | fluid inside main (padding **24px**) |

## Sidebar active states

- **Transport & Fleet** parent: expanded, **red** (`#c62828`) row background when child route active
- **Fuel & Expense** child: **white pill** background, navy text, **red dot** trailing
- Other nav: white/90 text, hover `white/10`

## Page header

- Breadcrumb: `Transport & Fleet > Fuel & Expense` (12px, gray / blue current)
- Title: 24px bold navy + fuel pump icon
- Subtitle: 14px slate
- CTA: blue `#1565c0`, "+ Add Transaction" + chevron-down

## KPI row (4 columns, equal)

1. Total Fuel Cost — ₱312,450.00, green +8.4% vs last month  
2. Other Expenses — ₱87,320.00, red -2.1%  
3. Total Operating Expense — ₱399,770.00  
4. Fuel Efficiency — 4.8 km/L  

## Tabs

Pill row: Fuel Transactions (filled blue), Other Expenses, Expense Categories, Reports — each with icon.

## Filter bar

White card: Date range | Vehicle | Expense type | search input | Export (outline)

## Main split

- **Left ~62%**: table "Fuel & Expense Records (68)" — columns Ref, Date, Vehicle, Type (badge), Details, Amount, Action  
- **Right ~38%**: detail card — bus image, ref, type badge, amount, sub-tabs Details/Receipt/Trip Link, grid fields, receipt thumb, Edit/Delete  

## Footer row

- Fuel Consumption Trend (bar + line)  
- Fuel Usage Summary: Total Volume, Total Distance, Avg Consumption  

## Do NOT render

Blue developer callout boxes from PNG.