import type { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  iconClassName,
}: {
  label: string
  value: string
  hint?: string
  icon: LucideIcon
  iconClassName?: string
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between p-5">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-navy">{value}</p>
          {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
        </div>
        <div className={cn('rounded-lg bg-blue-50 p-2 text-brand-blue', iconClassName)}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  )
}