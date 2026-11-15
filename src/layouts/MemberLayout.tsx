import { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { Bell, LogOut, Menu } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { memberNavigation } from '@/config/navigation'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/AuthProvider'
import { SidebarBrand } from '@/components/branding/SidebarBrand'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

export function MemberLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const { profile, signOut } = useAuth()

  const { data: memberCode } = useQuery({
    queryKey: ['member-code', profile?.member_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('members')
        .select('member_code')
        .eq('id', profile!.member_id!)
        .maybeSingle()
      if (error) throw error
      return (data as { member_code: string } | null)?.member_code ?? null
    },
    enabled: !!profile?.member_id,
  })

  const memberLabel = memberCode ?? (profile?.user_type === 'pending' ? 'Application pending' : 'Member')

  return (
    <div className="flex min-h-screen bg-surface">
      {mobileOpen ? (
        <button type="button" className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} />
      ) : null}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-navy text-white lg:static',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className="border-b border-white/10 px-3 py-4">
          <SidebarBrand portal="member" />
        </div>
        <nav className="space-y-1 p-3">
          {memberNavigation.map((item) =>
            item.href ? (
              <Link
                key={item.title}
                to={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm',
                  location.pathname === item.href ? 'bg-brand-blue text-white' : 'text-white/90 hover:bg-white/10',
                )}
              >
                {item.icon ? <item.icon className="h-4 w-4" /> : null}
                {item.title}
              </Link>
            ) : null,
          )}
        </nav>
        <div className="m-3 mt-auto rounded-lg bg-white/10 p-4 text-xs">
          <p className="font-medium">Need Help?</p>
          <p className="mt-1 text-white/70">Contact our support team</p>
          <Button variant="outline" size="sm" className="mt-3 w-full border-white/30 bg-white/10 text-white hover:bg-white/20">
            Get Support
          </Button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <p className="flex-1 text-sm font-medium text-navy">KAAGAPAY Cooperative Management System</p>
          <Bell className="h-5 w-5 text-slate-500" />
          <div className="hidden text-right text-xs sm:block">
            <p className="font-semibold text-navy">{profile?.full_name ?? 'Member'}</p>
            <p className="text-slate-500">{memberLabel}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => void signOut()}>
            <LogOut className="h-4 w-4" />
          </Button>
        </header>
        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}