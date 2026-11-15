import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ClipboardList } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/PageHeader'
import { supabase } from '@/lib/supabase'

type Application = {
  id: string
  full_name: string
  email: string | null
  membership_type: string | null
  status: string
  created_at: string
}

export function ApplicationsPage() {
  const qc = useQueryClient()
  const { data = [], error: loadError } = useQuery({
    queryKey: ['membership-applications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('membership_applications')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Application[]
    },
  })

  const approve = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('approve_membership_application', {
        application_id: id,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['membership-applications'] })
      qc.invalidateQueries({ queryKey: ['members'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
  })

  const reject = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('membership_applications')
        .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
        .eq('id', id)
        .eq('status', 'pending')
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['membership-applications'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
  })

  const actionError = approve.error ?? reject.error

  return (
    <div>
      <PageHeader
        title="Membership Applications"
        description="Review, approve, or reject pending membership applications."
        icon={<ClipboardList className="h-7 w-7" />}
      />
      {loadError ? <p className="mb-4 text-sm text-red-600">{(loadError as Error).message}</p> : null}
      {actionError ? <p className="mb-4 text-sm text-red-600">{(actionError as Error).message}</p> : null}
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left">Applicant</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Submitted</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-slate-500">
                    No applications found.
                  </td>
                </tr>
              ) : (
                data.map((app) => (
                  <tr key={app.id} className="border-t">
                    <td className="px-4 py-3">
                      <div className="font-medium">{app.full_name}</div>
                      <div className="text-xs text-slate-500">{app.email}</div>
                    </td>
                    <td className="px-4 py-3">{app.membership_type}</td>
                    <td className="px-4 py-3">
                      <Badge variant={app.status === 'pending' ? 'warning' : app.status === 'approved' ? 'success' : 'danger'}>
                        {app.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">{new Date(app.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      {app.status === 'pending' ? (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => reject.mutate(app.id)} disabled={reject.isPending}>
                            Reject
                          </Button>
                          <Button size="sm" onClick={() => approve.mutate(app.id)} disabled={approve.isPending}>
                            Approve
                          </Button>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}