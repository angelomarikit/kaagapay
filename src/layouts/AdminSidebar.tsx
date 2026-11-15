import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { adminNavigation, type NavItem } from '@/config/navigation'
import { SidebarBrand } from '@/components/branding/SidebarBrand'
import { isNavItemActive } from '@/lib/navActive'
import { cn } from '@/lib/utils'

function NavLink({
  item,
  depth = 0,
  siblingHrefs,
}: {
  item: NavItem
  depth?: number
  siblingHrefs?: string[]
}) {
  const location = useLocation()
  const childHrefs = item.children?.map((c) => c.href).filter(Boolean) as string[] | undefined
  const childActive =
    childHrefs?.some((href) => isNavItemActive(href, location.pathname, childHrefs)) ?? false

  const [open, setOpen] = useState(() => childActive)

  if (item.children?.length) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            'flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm',
            childActive
              ? 'bg-brand-red font-medium text-white'
              : 'text-white/90 hover:bg-white/10',
          )}
        >
          {item.icon ? <item.icon className="h-4 w-4 shrink-0" /> : null}
          <span className="flex-1">{item.title}</span>
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        {open ? (
          <div className="mt-1 space-y-0.5 pl-2">
            {item.children.map((child) => (
              <NavLink key={child.title} item={child} depth={depth + 1} siblingHrefs={childHrefs} />
            ))}
          </div>
        ) : null}
      </div>
    )
  }

  if (!item.href) return null

  const active = isNavItemActive(item.href, location.pathname, siblingHrefs)

  if (depth > 0) {
    return (
      <Link
        to={item.href}
        className={cn(
          'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
          active
            ? 'bg-white font-medium text-navy shadow-sm'
            : 'text-white/85 hover:bg-white/10 hover:text-white',
        )}
      >
        <span className="flex-1">{item.title}</span>
        {active ? <span className="h-2 w-2 shrink-0 rounded-full bg-brand-red" /> : null}
      </Link>
    )
  }

  return (
    <Link
      to={item.href}
      className={cn(
        'flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm',
        active && !item.children
          ? 'bg-brand-red font-medium text-white'
          : 'text-white/90 hover:bg-white/10',
      )}
    >
      {item.icon ? <item.icon className="h-4 w-4 shrink-0" /> : null}
      <span>{item.title}</span>
    </Link>
  )
}

export function AdminSidebar({ mobileOpen, onClose }: { mobileOpen?: boolean; onClose?: () => void }) {
  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-label="Close menu"
        />
      ) : null}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[260px] shrink-0 flex-col bg-navy text-white transition-transform lg:static',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className="border-b border-white/10 px-3 py-4">
          <SidebarBrand portal="admin" />
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3 text-[13px]" onClick={() => onClose?.()}>
          {adminNavigation.map((item) => (
            <NavLink key={item.title} item={item} />
          ))}
        </nav>
        <div className="pointer-events-none h-16 bg-linear-to-t from-brand-red/40 to-transparent" aria-hidden />
      </aside>
    </>
  )
}