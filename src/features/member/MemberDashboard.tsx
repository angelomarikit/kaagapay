import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Coins, FileText, HandCoins, LayoutDashboard, Wallet } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/features/auth/AuthProvider'
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay'
import { KpiCard } from '@/components/shared/KpiCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { DashboardDateRangePicker } from '@/components/shared/DashboardDateRangePicker'
import { dateRangeToBounds, defaultDashboardDateRange, type DashboardDateRange } from '@/lib/dashboardRange'
import { formatPeso } from '@/lib/money'
import { supabase } from '@/lib/supabase'

export function MemberDashboard() {
  const [dateRange, setDateRange] = useState<DashboardDateRange>(() => defaultDashboardDateRange())
  const bounds = dateRangeToBounds(dateRange)
  const { profile } = useAuth()
  const memberId = profile?.member_id

  const { data: summary } = useQuery({
    queryKey: ['member-summary', memberId],
    queryFn: async () => {
      const [contrib, loans, member] = await Promise.all([
        supabase.from('contributions').select('amount').eq('member_id', memberId!),
        supabase.from('loans').select('outstanding_principal, status').eq('member_id', memberId!),
        supabase.from('members').select('member_code, status').eq('id', memberId!).maybeSingle(),
      ])
      if (contrib.error) throw contrib.error
      if (loans.error) throw loans.error
      if (member.error) throw member.error
      const share = (contrib.data ?? []).reduce((s, r) => s + Number((r as { amount: string }).amount), 0)
      const balance = (loans.data ?? []).reduce(
        (s, r) =>
          s +
          (['active', 'delinquent'].includes((r as { status: string }).status)
            ? Number((r as { outstanding_principal: string }).outstanding_principal)
            : 0),
        0,
      )
      const m = member.data as { member_code: string; status: string } | null
      return {
        share,
        balance,
        memberCode: m?.member_code ?? '—',
        memberStatus: m?.status ?? 'unknown',
      }
    },
    enabled: !!memberId,
  })

  const { data: periodContrib = 0 } = useQuery({
    queryKey: ['member-period-contrib', memberId, dateRange.from, dateRange.to],
    queryFn: async () => {
      let q = supabase.from('contributions').select('amount').eq('member_id', memberId!)
      if (bounds.from) q = q.gte('contributed_at', bounds.from)
      if (bounds.toExclusive) q = q.lt('contributed_at', bounds.toExclusive)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []).reduce((s, r) => s + Number((r as { amount: string }).amount), 0)
    },
    enabled: !!memberId,
  })

  const { data: recentContrib = [] } = useQuery({
    queryKey: ['member-recent-contrib', memberId, dateRange.from, dateRange.to],
    queryFn: async () => {
      let q = supabase
        .from('contributions')
        .select('amount, contributed_at, receipt_reference')
        .eq('member_id', memberId!)
        .order('contributed_at', { ascending: false })
        .limit(12)
      if (bounds.from) q = q.gte('contributed_at', bounds.from)
      if (bounds.toExclusive) q = q.lt('contributed_at', bounds.toExclusive)
      const { data, error } = await q
      if (error) throw error
      return data as { amount: string; contributed_at: string; receipt_reference: string | null }[]
    },
    enabled: !!memberId,
  })

  const accountLabel =
    !memberId ? 'Pending' : summary?.memberStatus === 'active' ? 'Active' : (summary?.memberStatus ?? '—')

  return (
    <div>
      <PageHeader
        title={`Welcome, ${profile?.full_name ?? 'Member'}`}
        description={`Share capital, loans, and contributions · ${bounds.label}`}
        icon={<LayoutDashboard className="h-7 w-7" />}
        actions={<DashboardDateRangePicker value={dateRange} onChange={setDateRange} />}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Share capital"
          value={formatPeso(summary?.share ?? 0)}
          hint="All time"
          icon={Wallet}
          iconClassName="bg-blue-50 text-brand-blue"
        />
        <KpiCard
          label="Contributions"
          value={formatPeso(periodContrib)}
          hint={bounds.label}
          icon={HandCoins}
          iconClassName="bg-green-50 text-green-700"
        />
        <KpiCard
          label="Loan balance"
          value={formatPeso(summary?.balance ?? 0)}
          icon={Coins}
          iconClassName="bg-red-50 text-brand-red"
        />
        <KpiCard
          label="Membership"
          value={accountLabel}
          hint={summary?.memberCode ? `ID ${summary.memberCode}` : undefined}
          icon={FileText}
          iconClassName="bg-slate-100 text-navy"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Recent contributions · {bounds.label}</CardTitle>
            <Link to="/member/transactions" className="text-sm font-medium text-brand-blue hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {!memberId ? (
              <p className="text-sm text-slate-500">Your member profile will appear after your application is approved.</p>
            ) : recentContrib.length === 0 ? (
              <p className="text-sm text-slate-500">No contributions recorded yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-500">
                    <th className="py-2 font-medium">Date</th>
                    <th className="font-medium">Reference</th>
                    <th className="text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {recentContrib.map((row, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      <td className="py-3 text-navy">{new Date(row.contributed_at).toLocaleDateString()}</td>
                      <td className="text-slate-600">{row.receipt_reference ?? 'Contribution'}</td>
                      <td className="text-right font-medium text-navy">
                        <CurrencyDisplay amount={row.amount} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-2">
            {[
              { to: '/member/loans', label: 'My loans', icon: Wallet },
              { to: '/member/savings', label: 'Contributions', icon: HandCoins },
              { to: '/member/statements', label: 'Statements', icon: FileText },
              { to: '/member/transactions', label: 'Transactions', icon: Coins },
            ].map((a) => (
              <Button key={a.to} variant="outline" className="h-auto justify-start gap-2 py-3" asChild>
                <Link to={a.to}>
                  <a.icon className="h-4 w-4 text-brand-blue" />
                  {a.label}
                </Link>
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>

      {memberId && recentContrib.length > 0 ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
          <Badge variant="success">Posted</Badge>
          <span>Contributions are recorded by cooperative staff and reflected in your share capital total.</span>
        </div>
      ) : null}
    </div>
  )
}