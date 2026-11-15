import { useQuery } from '@tanstack/react-query'
import { formatPeso } from '@/lib/money'
import {
  dateRangeToBounds,
  defaultDashboardDateRange,
  type DashboardDateRange,
} from '@/lib/dashboardRange'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'

function sumAmount(
  rows: { total_amount?: string; amount?: string; total_cost?: string }[],
  key: 'total_amount' | 'amount' | 'total_cost',
) {
  return (rows ?? []).reduce((sum, row) => sum + Number(row[key] ?? 0), 0)
}

function withDateRange<T extends { gte: (c: string, v: string) => T; lt: (c: string, v: string) => T }>(
  query: T,
  column: string,
  from: string | null,
  toExclusive: string | null,
): T {
  let q = query
  if (from) q = q.gte(column, from)
  if (toExclusive) q = q.lt(column, toExclusive)
  return q
}

export function useDashboardStats(dateRange: DashboardDateRange = defaultDashboardDateRange()) {
  const bounds = dateRangeToBounds(dateRange)

  return useQuery({
    queryKey: ['dashboard-stats', dateRange.from, dateRange.to],
    enabled: isSupabaseConfigured,
    queryFn: async () => {
      const { from, toExclusive, label: rangeLabel } = bounds

      const [
        { count: totalMembers },
        { count: activeMembers },
        { count: activeVehicles },
        { data: collectionsPeriod },
        { count: pendingApps },
        { count: pendingMaintenance },
        { data: activeLoans },
        { data: fuelPeriod },
        { data: opexPeriod },
        { data: contributionsPeriod },
      ] = await Promise.all([
        supabase.from('members').select('*', { count: 'exact', head: true }),
        supabase.from('members').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('vehicles').select('*', { count: 'exact', head: true }).eq('status', 'available'),
        withDateRange(
          supabase.from('collection_transactions').select('total_amount'),
          'collected_at',
          from,
          toExclusive,
        ),
        supabase.from('membership_applications').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('maintenance_records').select('*', { count: 'exact', head: true }).eq('status', 'scheduled'),
        supabase.from('loans').select('outstanding_principal, status').eq('status', 'active'),
        withDateRange(supabase.from('fuel_transactions').select('total_cost'), 'transaction_date', from, toExclusive),
        withDateRange(supabase.from('operating_expenses').select('amount'), 'expense_date', from, toExclusive),
        withDateRange(supabase.from('contributions').select('amount'), 'contributed_at', from, toExclusive),
      ])

      const periodCollections = sumAmount(collectionsPeriod ?? [], 'total_amount')
      const periodContributions = sumAmount(contributionsPeriod ?? [], 'amount')
      const periodFuel = sumAmount(fuelPeriod ?? [], 'total_cost')
      const periodOpex = sumAmount(opexPeriod ?? [], 'amount')
      const loanOutstanding = (activeLoans ?? []).reduce(
        (s, r) => s + Number((r as { outstanding_principal: string }).outstanding_principal),
        0,
      )

      return {
        rangeLabel,
        totalMembers: totalMembers ?? 0,
        activeMembers: activeMembers ?? 0,
        activeVehicles: activeVehicles ?? 0,
        periodCollections: formatPeso(periodCollections),
        periodContributions: formatPeso(periodContributions),
        periodExpenses: formatPeso(periodFuel + periodOpex),
        outstandingLoans: formatPeso(loanOutstanding),
        pendingApplications: pendingApps ?? 0,
        pendingMaintenance: pendingMaintenance ?? 0,
      }
    },
  })
}

export type RecentActivityRow = {
  id: string
  occurred_at: string
  kind: string
  label: string
  amount: string
  status: string
}

export function useRecentActivity(dateRange: DashboardDateRange = defaultDashboardDateRange()) {
  const bounds = dateRangeToBounds(dateRange)

  return useQuery({
    queryKey: ['dashboard-recent', dateRange.from, dateRange.to],
    enabled: isSupabaseConfigured,
    queryFn: async () => {
      const { from, toExclusive } = bounds

      const [{ data: collections, error: cErr }, { data: contributions, error: mErr }] = await Promise.all([
        withDateRange(
          supabase
            .from('collection_transactions')
            .select('id, collected_at, total_amount, verification_status, receipt_number')
            .order('collected_at', { ascending: false })
            .limit(25),
          'collected_at',
          from,
          toExclusive,
        ),
        withDateRange(
          supabase
            .from('contributions')
            .select('id, contributed_at, amount, receipt_reference, members(full_name, member_code)')
            .order('contributed_at', { ascending: false })
            .limit(25),
          'contributed_at',
          from,
          toExclusive,
        ),
      ])
      if (cErr) throw cErr
      if (mErr) throw mErr

      const collectionRows: RecentActivityRow[] = (collections ?? []).map((r) => {
        const row = r as {
          id: string
          collected_at: string
          total_amount: string
          verification_status: string
          receipt_number: string | null
        }
        return {
          id: `coll-${row.id}`,
          occurred_at: row.collected_at,
          kind: 'POS Collection',
          label: row.receipt_number ?? 'POS collection',
          amount: row.total_amount,
          status: row.verification_status,
        }
      })

      const contributionRows: RecentActivityRow[] = (contributions ?? []).map((r) => {
        const row = r as {
          id: string
          contributed_at: string
          amount: string
          receipt_reference: string | null
          members:
            | { full_name: string; member_code: string }
            | { full_name: string; member_code: string }[]
            | null
        }
        const m = row.members
        const memberRow = Array.isArray(m) ? m[0] : m
        const member = memberRow ? `${memberRow.full_name} (${memberRow.member_code})` : 'Member'
        return {
          id: `cont-${row.id}`,
          occurred_at: row.contributed_at,
          kind: 'Contribution',
          label: row.receipt_reference ?? member,
          amount: row.amount,
          status: 'posted',
        }
      })

      return [...collectionRows, ...contributionRows]
        .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())
        .slice(0, 10)
    },
  })
}