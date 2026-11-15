import { Link } from 'react-router-dom'
import { Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { BrandLogo } from '@/components/branding/BrandLogo'
import { useAuth } from '@/features/auth/AuthProvider'

export function PendingApprovalPage() {
  const { profile, signOut } = useAuth()

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <Card className="w-full max-w-md shadow-lg">
        <CardContent className="space-y-5 p-8 text-center">
          <BrandLogo variant="full" size="hd" className="mb-2" />
          <Clock className="mx-auto h-10 w-10 text-brand-blue" />
          <h1 className="text-xl font-bold text-navy">Application pending</h1>
          <p className="text-sm text-slate-600">
            Thanks, {profile?.full_name ?? 'applicant'}. Your membership application is waiting for cooperative staff
            review. You will get access after an administrator approves it.
          </p>
          <p className="text-xs text-slate-500">Signed in as {profile?.email ?? '—'}</p>
          <div className="flex flex-col gap-2">
            <Button variant="outline" onClick={() => signOut()}>
              Sign out
            </Button>
            <Link to="/login" className="text-sm text-brand-blue hover:underline">
              Back to login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}