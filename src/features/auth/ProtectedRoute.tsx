import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { SupabaseSetupRequired } from '@/components/shared/SupabaseSetupRequired'
import { useAuth } from '@/features/auth/AuthProvider'
import { isSupabaseConfigured } from '@/lib/supabase'

export function RequireAuth() {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (!isSupabaseConfigured) {
    return <SupabaseSetupRequired />
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface p-8">
        <LoadingSkeleton className="h-10 w-64" />
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}

export function RequireStaffRole() {
  const { profile, loading } = useAuth()

  if (loading) return <LoadingSkeleton className="m-8 h-10 w-64" />

  if (profile?.user_type === 'pending') {
    return <Navigate to="/pending-approval" replace />
  }

  if (profile?.user_type !== 'staff') {
    return <Navigate to="/member" replace />
  }

  return <Outlet />
}

export function RequireMemberRole() {
  const { profile, loading } = useAuth()

  if (loading) return <LoadingSkeleton className="m-8 h-10 w-64" />

  if (profile?.user_type === 'pending') {
    return <Navigate to="/pending-approval" replace />
  }

  if (profile?.user_type !== 'member') {
    return <Navigate to="/admin" replace />
  }

  return <Outlet />
}