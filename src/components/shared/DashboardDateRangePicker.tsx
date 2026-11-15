import { Calendar } from 'lucide-react'
import {
  DATE_RANGE_PRESETS,
  type DashboardDateRange,
  type DateRangePreset,
  normalizeDashboardDateRange,
  presetToDateRange,
} from '@/lib/dashboardRange'
import { cn } from '@/lib/utils'

export function DashboardDateRangePicker({
  value,
  onChange,
  className,
}: {
  value: DashboardDateRange
  onChange: (value: DashboardDateRange) => void
  className?: string
}) {
  const setFrom = (from: string) => {
    onChange(normalizeDashboardDateRange({ ...value, from }))
  }

  const setTo = (to: string) => {
    onChange(normalizeDashboardDateRange({ ...value, to }))
  }

  const applyPreset = (preset: DateRangePreset) => {
    onChange(presetToDateRange(preset))
  }

  return (
    <div className={cn('flex flex-wrap items-end gap-2', className)}>
      <div className="flex items-center gap-1.5 text-sm text-slate-600">
        <Calendar className="h-4 w-4 shrink-0 text-brand-blue" aria-hidden />
        <span className="font-medium text-navy">From</span>
        <input
          type="date"
          value={value.from}
          max={value.to}
          onChange={(e) => setFrom(e.target.value)}
          className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm text-navy shadow-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          aria-label="Start date"
        />
      </div>
      <div className="flex items-center gap-1.5 text-sm text-slate-600">
        <span className="font-medium text-navy">To</span>
        <input
          type="date"
          value={value.to}
          min={value.from}
          onChange={(e) => setTo(e.target.value)}
          className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm text-navy shadow-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          aria-label="End date"
        />
      </div>
      <label className="flex items-center gap-1.5 text-sm text-slate-600">
        <span className="sr-only">Quick preset</span>
        <select
          defaultValue=""
          onChange={(e) => {
            const v = e.target.value as DateRangePreset
            if (v) applyPreset(v)
            e.target.value = ''
          }}
          className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-600 shadow-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          aria-label="Date preset"
        >
          <option value="">Presets…</option>
          {DATE_RANGE_PRESETS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}