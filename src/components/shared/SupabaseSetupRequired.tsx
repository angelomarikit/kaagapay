import { Link } from 'react-router-dom'
import { Database } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export function SupabaseSetupRequired() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-6">
      <Card className="max-w-lg">
        <CardContent className="space-y-4 p-8 text-center">
          <Database className="mx-auto h-12 w-12 text-brand-blue" />
          <h1 className="text-xl font-bold text-navy">Database connection required</h1>
          <p className="text-sm text-slate-600">
            Add <code className="rounded bg-slate-100 px-1">VITE_SUPABASE_URL</code> and{' '}
            <code className="rounded bg-slate-100 px-1">VITE_SUPABASE_ANON_KEY</code> to your{' '}
            <code className="rounded bg-slate-100 px-1">.env</code> file, run migrations{' '}
            <code className="rounded bg-slate-100 px-1">001</code>–<code className="rounded bg-slate-100 px-1">014</code>{' '}
            in the Supabase SQL Editor, then sign in.
          </p>
          <p className="text-xs text-slate-500">See `supabase/README.md` for the migration order.</p>
          <Button asChild variant="outline">
            <Link to="/login">Back to login</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}