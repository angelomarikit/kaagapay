import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Bus, Coins, FileBarChart, Fuel, HandCoins, LayoutDashboard, UserPlus, Wallet } from 'lucide-react'
import { defaultDashboardDateRange, type DashboardDateRange } from '@/lib/dashboardRange'
import { DashboardDateRangePicker } from '@/components/shared/DashboardDateRangePicker'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { KpiCard } from '@/components/shared/KpiCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay'
import { useDashboardStats, useRecentActivity } from '@/hooks/useDashboardStats'

export function AdminDashboard() {
  const [dateRange, setDateRange] = useState<DashboardDateRange>(() => defaultDashboardDateRange())
  const { data, isLoading, isError } = useDashboardStats(dateRange)
  const { data: recent = [], isLoading: recentLoading } = useRecentActivity(dateRange)
  const periodHint = data?.rangeLabel ?? 'Month to date'

  return (
    <div>
      <PageHeader
        title="Executive Dashboard"
        description={`Operations and financial overview · ${periodHint}`}
        icon={<LayoutDashboard className="h-7 w-7" />}
        actions={<DashboardDateRangePicker value={dateRange} onChange={setDateRange} />}
      />
      {isLoading ? (
        <LoadingSkeleton className="mb-6 h-24 w-full" />
      ) : (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Total Members" value={String(data?.totalMembers ?? '—')} icon={UserPlus} />
          <KpiCard label="Active Vehicles" value={String(data?.activeVehicles ?? '—')} icon={Bus} />
          <KpiCard label="Pending Approvals" value={String(data?.pendingApplications ?? '—')} icon={FileBarChart} iconClassName="bg-amber-50 text-amber-700" />
          <KpiCard label="Active Members" value={String(data?.activeMembers ?? '—')} icon={UserPlus} iconClassName="bg-purple-50 text-purple-800" />
        </div>
      )}
      {isLoading ? null : (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Collections" value={data?.periodCollections ?? '₱0.00'} hint={periodHint} icon={HandCoins} iconClassName="bg-blue-50 text-brand-blue" />
          <KpiCard label="Contributions" value={data?.periodContributions ?? '₱0.00'} hint={periodHint} icon={Coins} iconClassName="bg-green-50 text-green-700" />
          <KpiCard label="Expenses" value={data?.periodExpenses ?? '₱0.00'} hint={periodHint} icon={Fuel} iconClassName="bg-red-50 text-red-700" />
          <KpiCard label="Outstanding Loans" value={data?.outstandingLoans ?? '₱0.00'} icon={Wallet} />
        </div>
      )}
      {isError ? <p className="mb-4 text-sm text-amber-800">Connect Supabase and run migrations to load live dashboard data.</p> : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent collections &amp; contributions · {periodHint}</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500">
                  <th className="py-2">Date</th>
                  <th>Type</th>
                  <th>Reference</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentLoading ? (
                  <tr>
                    <td colSpan={5} className="py-4 text-slate-500">
                      Loading…
                    </td>
                  </tr>
                ) : recent.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-4 text-slate-500">
                      No POS collections or membership contributions yet. Use Daily Collections POS or Membership → Contributions.
                    </td>
                  </tr>
                ) : (
                  recent.map((row) => (
                    <tr key={row.id} className="border-b">
                      <td className="py-3">{new Date(row.occurred_at).toLocaleString()}</td>
                      <td>{row.kind}</td>
                      <td>{row.label}</td>
                      <td>
                        <CurrencyDisplay amount={row.amount} />
                      </td>
                      <td>
                        <Badge
                          variant={
                            row.status === 'confirmed' || row.status === 'posted' ? 'success' : 'warning'
                          }
                        >
                          {row.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Button asChild variant="outline" className="h-auto flex-col gap-1 py-4">
              <Link to="/admin/membership/applications">
                <UserPlus className="h-5 w-5 text-brand-blue" />
                Applications
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto flex-col gap-1 py-4">
              <Link to="/admin/collections/pos">
                <HandCoins className="h-5 w-5 text-brand-red" />
                Record Collection
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto flex-col gap-1 py-4">
              <Link to="/admin/membership/contributions">
                <Coins className="h-5 w-5 text-green-700" />
                Contributions
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto flex-col gap-1 py-4">
              <Link to="/admin/fleet/dispatch">
                <Bus className="h-5 w-5 text-brand-blue" />
                Dispatch
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto flex-col gap-1 py-4">
              <Link to="/admin/fleet/vehicles">
                <Bus className="h-5 w-5 text-brand-blue" />
                Fleet
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Operational alerts</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
          <div className="flex justify-between rounded-lg border p-3">
            <span>Pending membership applications</span>
            <strong>{data?.pendingApplications ?? '—'}</strong>
          </div>
          <div className="flex justify-between rounded-lg border p-3">
            <span>Scheduled maintenance</span>
            <strong>{data?.pendingMaintenance ?? '—'}</strong>
          </div>
          <div className="flex justify-between rounded-lg border p-3">
            <span>Vehicles available</span>
            <strong>{data?.activeVehicles ?? '—'}</strong>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}