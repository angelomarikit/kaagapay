import { cn } from '@/lib/utils'

type BrandTitleProps = {
  /** `dark` = navy sidebar; `light` = white auth card */
  tone?: 'dark' | 'light'
  subtitle?: string
  className?: string
}

export function BrandTitle({ tone = 'light', subtitle, className }: BrandTitleProps) {
  const titleClass = tone === 'dark' ? 'text-white' : 'text-navy'
  const subClass = tone === 'dark' ? 'text-white/80' : 'text-slate-600'

  return (
    <div className={cn('text-center', className)}>
      <p className={cn('text-lg font-bold uppercase tracking-wide sm:text-xl', titleClass)}>KAAGAPAY COOPERATIVE</p>
      {subtitle ? <p className={cn('mt-1 text-xs sm:text-sm', subClass)}>{subtitle}</p> : null}
    </div>
  )
}