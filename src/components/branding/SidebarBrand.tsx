import { BrandLogo } from '@/components/branding/BrandLogo'
import { cn } from '@/lib/utils'

export function SidebarBrand({
  portal,
  className,
}: {
  portal: 'admin' | 'member'
  className?: string
}) {
  const subtitle = portal === 'admin' ? 'Management System' : 'Member Portal'

  return (
    <div className={cn('text-center', className)}>
      <BrandLogo variant="sidebar" size="sidebar" className="mx-auto w-full" />
      <p className="mt-2 text-xs font-medium tracking-wide text-white/75">{subtitle}</p>
    </div>
  )
}