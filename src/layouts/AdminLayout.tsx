import { useState, type ReactNode } from 'react'
import { AdminHeader } from '@/layouts/AdminHeader'
import { AdminSidebar } from '@/layouts/AdminSidebar'
import { isSupabaseConfigured } from '@/lib/supabase'

export function AdminLayout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-surface">
      <AdminSidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminHeader onMenuClick={() => setMobileOpen(true)} />
        {!isSupabaseConfigured ? (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-900">
            Configure <code className="rounded bg-amber-100 px-1">VITE_SUPABASE_URL</code> and{' '}
            <code className="rounded bg-amber-100 px-1">VITE_SUPABASE_ANON_KEY</code> in `.env`, then run
            SQL migrations from `supabase/migrations/`.
          </div>
        ) : null}
        <main className="min-h-0 flex-1 overflow-x-hidden bg-surface px-5 py-5 lg:px-6">{children}</main>
      </div>
    </div>
  )
}