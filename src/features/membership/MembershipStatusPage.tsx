import { useQuery } from '@tanstack/react-query'
import { UserCheck } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/PageHeader'
import { supabase } from '@/lib/supabase'

export function MembershipStatusPage() {
  const { data = [] } = useQuery({
    queryKey: ['membership-status'],
    queryFn: async () => {
      const { data, error } = await supabase.from('members').select('member_code, full_name, status').order('full_name')
      if (error) throw error
      return data
    },
  })

  return (
    <div>
      <PageHeader
        title="Membership Status"
        description="View and manage member status, renewals, and history."
        icon={<UserCheck className="h-7 w-7" />}
      />
      <Card>
        <CardContent className="divide-y p-0">
          {data.map((m) => {
            const row = m as { member_code: string; full_name: string; status: string }
            return (
              <div key={row.member_code} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <p className="font-medium">{row.full_name}</p>
                  <p className="text-slate-500">{row.member_code}</p>
                </div>
                <Badge variant={row.status === 'active' ? 'success' : 'warning'}>{row.status}</Badge>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}