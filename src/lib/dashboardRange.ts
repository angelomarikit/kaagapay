/** Inclusive calendar dates (YYYY-MM-DD) */
export type DashboardDateRange = {
  from: string
  to: string
}

export type DashboardRangeBounds = {
  from: string | null
  /** Exclusive upper bound (start of day after range end), for timestamptz columns */
  toExclusive: string | null
  label: string
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

export function toDateString(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function addDays(d: Date, days: number) {
  const next = new Date(d)
  next.setDate(next.getDate() + days)
  return next
}

function parseLocalDate(iso: string) {
  const [y, m, day] = iso.split('-').map(Number)
  return new Date(y, m - 1, day)
}

export function defaultDashboardDateRange(now = new Date()): DashboardDateRange {
  const to = toDateString(now)
  const from = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`
  return { from, to }
}

export function normalizeDashboardDateRange(range: DashboardDateRange): DashboardDateRange {
  if (range.from <= range.to) return range
  return { from: range.to, to: range.from }
}

export function dateRangeToBounds(range: DashboardDateRange): DashboardRangeBounds {
  const normalized = normalizeDashboardDateRange(range)
  const toExclusive = toDateString(addDays(parseLocalDate(normalized.to), 1))
  const fromLabel = parseLocalDate(normalized.from).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const toLabel = parseLocalDate(normalized.to).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const label = normalized.from === normalized.to ? fromLabel : `${fromLabel} – ${toLabel}`
  return {
    from: normalized.from,
    toExclusive,
    label,
  }
}

export type DateRangePreset = 'today' | '7d' | '30d' | 'mtd' | 'ytd'

export const DATE_RANGE_PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'mtd', label: 'This month' },
  { value: 'ytd', label: 'This year' },
]

export function presetToDateRange(preset: DateRangePreset, now = new Date()): DashboardDateRange {
  const to = toDateString(now)
  switch (preset) {
    case 'today':
      return { from: to, to }
    case '7d':
      return { from: toDateString(addDays(now, -6)), to }
    case '30d':
      return { from: toDateString(addDays(now, -29)), to }
    case 'ytd':
      return { from: `${now.getFullYear()}-01-01`, to }
    case 'mtd':
    default:
      return defaultDashboardDateRange(now)
  }
}