import { formatPeso } from '@/lib/money'
import { cn } from '@/lib/utils'

export function CurrencyDisplay({
  amount,
  className,
}: {
  amount: string | number | null | undefined
  className?: string
}) {
  return <span className={cn('tabular-nums', className)}>{formatPeso(amount)}</span>
}