import { Bell, LogOut, Menu, Search } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/features/auth/AuthProvider'
import { getAdminHeaderTitle, getAdminSearchPlaceholder } from '@/layouts/adminChrome'

export function AdminHeader({ onMenuClick }: { onMenuClick?: () => void }) {
  const { profile, signOut } = useAuth()
  const { pathname } = useLocation()
  const searchPlaceholder = getAdminSearchPlaceholder(pathname)
  const headerTitle = getAdminHeaderTitle(pathname)

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-slate-200 bg-white">
      <div className="flex h-full items-center gap-3 px-4 lg:px-5">
        <Button variant="ghost" size="icon" className="shrink-0 lg:hidden" onClick={onMenuClick}>
          <Menu className="h-5 w-5 text-navy" />
        </Button>
        <Button variant="ghost" size="icon" className="hidden shrink-0 lg:inline-flex">
          <Menu className="h-5 w-5 text-navy" />
        </Button>
        <p className="hidden max-w-[280px] shrink-0 text-sm font-semibold text-navy xl:max-w-none">{headerTitle}</p>
        <div className="mx-auto hidden min-w-0 max-w-xl flex-1 lg:flex">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="h-10 rounded-full border-slate-200 bg-slate-50 pl-9 text-sm"
              placeholder={searchPlaceholder}
            />
          </div>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5 text-slate-600" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-brand-red" />
          </Button>
          <div className="hidden text-right text-xs sm:block">
            <div className="font-semibold text-navy">{profile?.full_name ?? 'Admin User'}</div>
            <div className="text-slate-500">General Manager</div>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-blue text-xs font-bold text-white">
            {profile?.full_name?.slice(0, 2).toUpperCase() ?? 'AM'}
          </div>
          <Button variant="ghost" size="icon" onClick={() => void signOut()} title="Sign out" className="hidden sm:inline-flex">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}